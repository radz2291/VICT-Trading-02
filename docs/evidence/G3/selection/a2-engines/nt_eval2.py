# NautilusTrader local evaluation — G3 Part A2 (owner-permitted research,
# 2026-09-30). Machine-readable: two runs in-process; prints NT-RESULT JSON.
# Research/proof ONLY per D-005 — no adoption, no LGPL acceptance, no shipping.
import json
import nautilus_trader
from nautilus_trader.backtest.engine import BacktestEngine
from nautilus_trader.model.data import Bar, BarType, QuoteTick
from nautilus_trader.model.identifiers import InstrumentId
from nautilus_trader.model.enums import OrderSide, AccountType, OmsType
from nautilus_trader.model.objects import Price, Quantity, Money
from nautilus_trader.test_kit.providers import TestInstrumentProvider

FIXTURE = r"C:/Users/RZ1/Desktop/RZ/260927-VCT-Trading/docs/evidence/G3/fixtures/hand-calculated-fixture.json"

with open(FIXTURE, "r", encoding="utf-8") as f:
    fixture = json.load(f)

instrument = TestInstrumentProvider.audusd_cfd()
instrument_id = instrument.id
PREC = instrument.price_precision
bar_type = BarType.from_str(f"{instrument_id}-15-MINUTE-BID-EXTERNAL")

bars = []
for b in fixture["bars"]:
    bars.append(
        Bar(
            bar_type=bar_type,
            open=Price(b["open"], precision=PREC),
            high=Price(b["high"], precision=PREC),
            low=Price(b["low"], precision=PREC),
            close=Price(b["close"], precision=PREC),
            volume=Quantity.from_int(1),
            ts_event=(b["time"] + 900) * 1_000_000_000,
            ts_init=(b["time"] + 900) * 1_000_000_000,
        )
    )

quotes = []
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

from nautilus_trader.trading.strategy import Strategy
from nautilus_trader.config import StrategyConfig


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
        self.closes.append(float(bar.close))
        if len(self.closes) < 3:
            return
        m = (self.closes[-1] + self.closes[-2] + self.closes[-3]) / 3
        if bar.close > m and not self.position_open:
            self.submit_order(
                self.order_factory.market(
                    instrument_id=self.config.instrument_id,
                    order_side=OrderSide.BUY,
                    quantity=instrument.make_qty(self.config.trade_size),
                )
            )
            self.position_open = True
        elif bar.close < m and self.position_open:
            self.submit_order(
                self.order_factory.market(
                    instrument_id=self.config.instrument_id,
                    order_side=OrderSide.SELL,
                    quantity=instrument.make_qty(self.config.trade_size),
                )
            )
            self.position_open = False


def one_run(run_number: int):
    engine = BacktestEngine()
    engine.add_venue(
        venue=instrument.venue,
        oms_type=OmsType.NETTING,
        account_type=AccountType.MARGIN,
        starting_balances=[Money(2000, instrument.quote_currency)],
        bar_execution=True,
    )
    engine.add_instrument(instrument)
    engine.add_data(bars)
    engine.add_data(quotes)
    strategy = Sma3Strategy(Sma3Config(instrument_id=instrument_id, bar_type=bar_type))
    engine.add_strategy(strategy)
    import datetime as dt

    engine.run(start=dt.datetime(2027, 1, 1, tzinfo=dt.timezone.utc), end=dt.datetime(2027, 12, 31, tzinfo=dt.timezone.utc))
    fills_df = engine.trader.generate_order_fills_report()
    fills = []
    for _, row in fills_df.iterrows():
        fills.append(
            {
                "side": row["side"],
                "qty": str(row["quantity"]),
                "avg_px": float(row["avg_px"]),
                "ts_last": str(row["ts_last"]),
                "commissions": str(row["commissions"]),
                "slippage": float(row["slippage"]),
            }
        )
    account = engine.trader.generate_account_report(venue=instrument.venue)
    balances = []
    try:
        for col in account.columns:
            if "balance" in col.lower() or "free" in col.lower() or "locked" in col.lower():
                balances.append(f"{col}={account[col].iloc[-1]}")
    except Exception:  # noqa: BLE001
        pass
    return {"fills": fills, "balances": balances, "fill_count": len(fills)}


run1 = one_run(1)
run2 = one_run(2)


def compare_fills(a, b):
    if len(a) != len(b):
        return False
    for fa, fb in zip(a, b):
        for key in ("side", "qty", "avg_px", "ts_last", "commissions", "slippage"):
            if fa[key] != fb[key]:
                return False
    return True


result = {
    "nt_version": nautilus_trader.__version__,
    "fill_count_run1": run1["fill_count"],
    "fill_count_run2": run2["fill_count"],
    "deterministic": compare_fills(run1["fills"], run2["fills"]),
    "fills_run1": run1["fills"],
    "balances_run1": run1["balances"],
}
print("NT-RESULT " + json.dumps(result, indent=1))