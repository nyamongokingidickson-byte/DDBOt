/* ============================================================
   NEW FILE — Tool Kit engine mixin (Dylan Fx advanced features)
   Adds digit-analysis + wait-for-digit entry logic to the trade
   engine. Composed in trade/index.js like the other mixins
   (Ticks, Purchase, …).
   All methods read the live tick list via ticksService, so they
   update in real time and run in O(X) per call.
   ============================================================ */
import { localize } from '@deriv-com/translations';
import { observer as globalObserver } from '../../../utils/observer';
import { getLastDigit } from '../utils/helpers';

export default Engine =>
    class ToolKit extends Engine {
        /* ---------- shared helpers ---------- */
        async tkDigits(count) {
            const ticks = await this.$scope.ticksService.request({ symbol: this.symbol });
            const pip_size = this.getPipSize();
            const n = Math.max(1, Math.floor(Number(count) || 1));
            return ticks.slice(-n).map(t => getLastDigit(t.quote.toFixed(pip_size)));
        }

        async tkQuotes(count) {
            const ticks = await this.$scope.ticksService.request({ symbol: this.symbol });
            const n = Math.max(1, Math.floor(Number(count) || 1));
            return ticks.slice(-n).map(t => t.quote);
        }

        /* wait for exactly one new tick on the current symbol */
        tkWaitOneTick() {
            return new Promise(resolve => {
                const { ticksService } = this.$scope;
                let key;
                const callback = ticks => {
                    ticksService.stopMonitor({ symbol: this.symbol, key });
                    resolve(ticks.slice(-1)[0]);
                };
                ticksService.monitor({ symbol: this.symbol, callback }).then(k => {
                    key = k;
                });
            });
        }

        /* ---------- Last X Digits Comparison (Boolean) ----------
           ALL X digits must satisfy the condition.
           all_same / all_diff ignore the value input. */
        async tkLastXDigitsComparison(count, comparison, digit) {
            const n = Math.max(1, Math.floor(Number(count) || 1));
            const ds = await this.tkDigits(n);
            if (ds.length < n) return false;
            switch (comparison) {
                case 'all_same': {
                    for (let i = 1; i < ds.length; i++) if (ds[i] !== ds[0]) return false;
                    return true;
                }
                case 'all_diff': {
                    let seen = 0;
                    for (let i = 0; i < ds.length; i++) {
                        const bit = 1 << ds[i];
                        if (seen & bit) return false;
                        seen |= bit;
                    }
                    return true;
                }
                default: {
                    const y = Math.max(0, Math.min(9, Math.round(Number(digit) || 0)));
                    const test = {
                        gt: v => v > y,
                        gte: v => v >= y,
                        lt: v => v < y,
                        lte: v => v <= y,
                        eq: v => v === y,
                        neq: v => v !== y,
                    }[comparison];
                    if (!test) return false;
                    for (let i = 0; i < ds.length; i++) if (!test(ds[i])) return false;
                    return true;
                }
            }
        }

        /* ---------- Wait-for-digit entry (statement) ----------
           1) last X digits must satisfy the comparison, else return
              immediately (before-purchase re-runs on the next tick).
           2) capture the trigger digit (last digit right now) and
              wait tick-by-tick until that digit appears again.
           3) purchase; for digit trade types the trigger digit is
              applied as the prediction automatically. */
        async tkWaitDigitBuy(count, comparison, digit, contract_type) {
            const ok = await this.tkLastXDigitsComparison(count, comparison, digit);
            if (!ok) return;

            const last = await this.tkDigits(1);
            const trigger = last[0];
            this.tk_trigger_digit = trigger;

            globalObserver.emit('ui.log.info', localize('[Wait-digit] Condition met. Waiting for digit {{digit}} to appear…', { digit: trigger }));

            const pip_size = this.getPipSize();
            const MAX_WAIT_TICKS = 300; /* ~10 min on 2s ticks */
            for (let waited = 1; waited <= MAX_WAIT_TICKS; waited++) {
                const tick = await this.tkWaitOneTick();
                const d = getLastDigit(tick.quote.toFixed(pip_size));
                if (d === trigger) {
                    globalObserver.emit('ui.log.success', localize('[Wait-digit] Digit {{digit}} appeared after {{n}} tick(s) — purchasing.', { digit: trigger, n: waited }));
                    /* digit contracts predict the trigger digit */
                    if (['DIGITMATCH', 'DIGITDIFF', 'DIGITOVER', 'DIGITUNDER'].includes(contract_type)) {
                        try {
                            this.tradeOptions = Object.assign({}, this.tradeOptions, { prediction: trigger });
                            /* refresh proposals so the purchase uses the new barrier */
                            if (typeof this.makeProposals === 'function' && this.tradeOptions) {
                                this.makeProposals(Object.assign({}, this.tradeOptions, { prediction: trigger }));
                                if (typeof this.checkProposalReady === 'function') this.checkProposalReady();
                            }
                        } catch (e) {
                            /* proposals refresh is best-effort; purchase falls back to current barrier */
                        }
                    }
                    return this.purchase(contract_type);
                }
            }
            globalObserver.emit('ui.log.warn', localize('[Wait-digit] Gave up waiting — re-evaluating the condition.'));
        }

        /* trigger digit captured by the most recent wait-for-digit run */
        tkGetTriggerDigit() {
            return this.tk_trigger_digit ?? -1;
        }
    };
