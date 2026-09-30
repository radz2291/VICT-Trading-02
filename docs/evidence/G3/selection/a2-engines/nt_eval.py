# NautilusTrader local evaluation — G3 Part A2 (owner-permitted research,
# 2026-09-30). Evaluates the hand-calculated fixture through NT's engine.
# Research/proof ONLY per D-005: this does not adopt NT, does not accept its
# LGPL implications for distribution, and does not ship it.
#
# Targets:
#  - correctness: can NT reproduce the hand-calculated trade/fill/cost table?
#  - determinism: two runs identical?
#  - footprint: install size, versions, process model (recorded by the driver).
import json
import os
import sys

import nautilus_trader
from nautilus_trader.backtest.engine import BacktestEngine
from nautilus_trader.config import BacktestEngineConfig
from nautilus_trader.model.data import Bar, BarType
from nautilus_trader.model.enums import OrderSide, PriceType
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.objects import Price, Quantity

FIXTURE = r"C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/fixtures/hand-calculated-fixture.json"

with open(FIXTURE, "r", encoding="utf-8") as f:
    fixture = json.load(f)

print("NT-VERSION", nautilus_trader.__version__)

# --- build bars in NT's model (CFD instrument, 2-dp price, 0-dp size) -------
# instrument: generic XAU/USD CFD via the test-kit provider if available
try:
    from nautilus_trader.test_kit.providers import TestInstrumentProvider

    instrument = TestInstrumentProvider.audusd_cfd()  # nearest available CFD template; XAUUSD-specific instrument not provided by the test kit
    instrument_id = instrument.id
except Exception as e:  # noqa: BLE001
    print("INSTRUMENT-PROVIDER-FAIL", repr(e)[:200])
    sys.exit(2)

bar_type = BarType.from_str(f"{instrument_id}-15-MINUTE-BID-EXTERNAL")
bars = []
PREC = instrument.price_precision
for b in fixture["bars"]:
    bars.append(
        Bar(
            bar_type=bar_type,
            open=Price(b["open"], precision=PREC),
            high=Price(b["high"], precision=PREC),
            low=Price(b["low"], precision=PREC),
            close=Price(b["close"], precision=PREC),
            volume=Quantity.from_int(1),
            ts_event=(b["time"] + 900) * 1_000_000_000,  # close time as event
            ts_init=(b["time"] + 900) * 1_000_000_000,
        )
    )

engine = BacktestEngine()
from nautilus_trader.model.enums import AccountType, OmsType
from nautilus_trader.model.objects import Money
engine.add_venue(
    venue=instrument.venue,
    oms_type=OmsType.NETTING,
    account_type=AccountType.MARGIN,
    starting_balances=[Money(2000, instrument.quote_currency)],
    bar_execution=True,
)
engine.add_instrument(instrument)
engine.add_data(bars)

# Synthesized quotes: one quote per bar at its OPEN instant, bid=ask=open.
# Recorded finding: with bar data alone, NT rejected every market order with
# reason='no market' (bar_execution alone did not give market orders a
# market). The synthesized quotes let the matcher fill at the next bar open —
# exactly the fill model the hand fixture assumes. This configuration step is
# itself part of the integration-cost evidence.
from nautilus_trader.model.data import QuoteTick
quotes = []
SPREC = instrument.size_precision
for b in fixture["bars"]:
    p = Price(b["open"], PREC)
    quotes.append(
        QuoteTick(
            instrument_id=instrument_id,
            bid_price=p,
            ask_price=p,
            bid_size=Quantity.from_int(1),
            ask_size=Quantity.from_int(1),
            ts_event=b["time"] * 1_000_000_000,
            ts_init=b["time"] * 1_000_000_000,
        )
    )
engine.add_data(quotes)


# --- strategy: SMA3 long/flat (same decisions as the hand fixture) ----------
from nautilus_trader.trading.strategy import Strategy  # noqa: E402
from nautilus_trader.config import StrategyConfig  # noqa: E402


class Sma3Config(StrategyConfig, frozen=True):
    instrument_id: InstrumentId
    bar_type: BarType
    trade_size: int = 10


class Sma3Strategy(Strategy):
    def __init__(self, config: Sma3Config) -> None:
        super().__init__(config)
        self.closes = []
        self.position_open = False

    def on_start(self) -> None:
        self.subscribe_bars(self.config.bar_type)

    def on_bar(self, bar: Bar) -> None:
        print("ONBAR", bar.bar_type, float(bar.close), flush=True)
        self.closes.append(float(bar.close))
        if len(self.closes) < 3:
            return
        m = (self.closes[-1] + self.closes[-2] + self.closes[-3]) / 3
        if bar.close > m and not self.position_open:
            order = self.order_factory.market(
                instrument_id=self.config.instrument_id,
                order_side=OrderSide.BUY,
                quantity=instrument.make_qty(self.config.trade_size),
            )
            self.submit_order(order)
            self.position_open = True
        elif bar.close < m and self.position_open:
            order = self.order_factory.market(
                instrument_id=self.config.instrument_id,
                order_side=OrderSide.SELL,
                quantity=instrument.make_qty(self.config.trade_size),
            )
            self.submit_order(order)
            self.position_open = False


config = Sma3Config(instrument_id=instrument_id, bar_type=bar_type)
strategy = Sma3Strategy(config=config)
engine.add_strategy(strategy)

import datetime as dt  # noqa: E402

start = dt.datetime(2027, 1, 1, tzinfo=dt.timezone.utc)
end = dt.datetime(2027, 12, 31, tzinfo=dt.timezone.utc)
engine.run(start=start, end=end)

account = engine.trader.generate_account_report(venue=instrument.venue)
fills = engine.trader.generate_order_fills_report()
positions = engine.trader.generate_positions_report()

print("NT-FILLS", len(fills))
print("NT-FILLS-DETAIL")
print(fills.to_string()[:4000])
print("NT-POSITIONS")
print(positions.to_string()[:2000])
print("NT-ACCOUNT")
print(str(account)[:2000])
