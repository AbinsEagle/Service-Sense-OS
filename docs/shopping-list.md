# Shopping list (as of 2026-10-03)

Already have: ESP32 DevKit and built circuit, DS18B20, TDS module, pressure transducer, AA batteries, traffic light module, 4-button tactile module.
No longer needed: push buttons, WS2812B LEDs.

## Buy now
| Part | Qty | For |
|---|---|---|
| ADS1115 module | 1 | final TDS, voltage, pressure, battery readings |
| ZMPT101B AC voltage module | 1 | voltage reading (0-250 V) |
| MT3608 boost module | 1 | 5 V for ZMPT101B and pressure sensor |
| AA battery holder with leads (3x or 4x, see design-decisions.md) | 1 | battery pack |

## Small parts
- Resistors for the battery divider (10k/15k and 47k, a few of each until the value is decided)
- 10k and 15k resistors for the pressure divider; 4.7k spare for the DS18B20 pull-up
- 100 uF and 0.1 uF capacitors
- AMS1117-3.3 regulator (optional), slide switch (optional)

## Wiring and tools
- Perfboard, header pins, jumper wires, solder
- Multimeter (needed to set the MT3608 to 5.0 V and to check cut-off and polarity)
- Second ESP32 DevKit (optional backup)

## Later
- Enclosure; a safe 230 V test setup for the voltage sensor (insulated plug-in cable, no loose wires).
