"""Independent arithmetic; no production imports or generated expectations.
Coefficients: D'Agostino 2008 / FHS official coefficients; Inker 2021 Table 2.
Scientific citations are listed in THIRD-PARTY-NOTICES.md.
"""
from math import log, exp

# Above knot: max term only; female factor included.
f55 = 142 * (80 / (88.4 * .7)) ** -1.200 * .9938 ** 55 * 1.012
# Below knot: min term only; sex-specific alpha.
f40 = 142 * (50 / (88.4 * .7)) ** -.241 * .9938 ** 40 * 1.012
m45 = 142 * (70 / (88.4 * .9)) ** -.302 * .9938 ** 45
score = 3.06117 * log(55) + 1.12370 * log(5.5 * 38.67) - .93263 * log(1.1 * 38.67) + 1.93303 * log(135) + .57367
diabetes = 100 * (1 - .88936 ** exp(score - 23.9802))
for name, value, pin, tolerance in [
    ('W1a female55 Scr80', f55, 75.0007870842784, .01),
    ('W1b female40 Scr50', f40, 118.0, .2),
    ('W1b male45 Scr70', m45, 111.6, .2),
    ('W1c male55 diabetes', diabetes, 24.36, .1),
]:
    assert abs(value - pin) < tolerance
    print(f'{name}: {value:.14f}; test pin {pin}; tolerance {tolerance}; PASS')
