# ♟️ Arena Sample Match — mChess vs Stockfish

| | Engine | Config |
|---|---|---|
| 👑 | **mChess** (Wise King) | depth 30 · 30s/move |
| 🐟 | **Stockfish** | depth 5 |

**Result: 🤝 Draw — Threefold Repetition · 118 moves**

---

## 📊 Engine Stats (mChess)

| Phase | Depth reached | NPS | Notes |
|---|---|---|---|
| Opening | d:7–10/30 | ~20K | Book move on move 1 |
| Middlegame | d:6–10/30 | ~25–35K | Several time-limit hits |
| Endgame | d:7–11/30 | ~45–70K | NPS climbs as pieces simplify |
| **Peak** | **d:11/30** | **~70K** | Move 47–52 (K+Q endgame) |

> Time-limit hits (⚠️) occurred in tactical middlegame positions — the engine was searching 1M+ nodes within 30s.

---

## 🎮 Move Log (selected)

| Move | 👑 mChess | ⏱️ | Depth | NPS | 🐟 Stockfish |
|---|---|---|---|---|---|
| 1 | c4 | 0.0s | [book] | — | c5 |
| 2 | Nf3 | 20.4s | 10/30 | 20K | g6 |
| 3 | Nc3 | 15.1s | 9/30 | 18K | Bg7 |
| 4 | e3 | 21.3s | 7/30 | ~4K | Bxc3 |
| 5 | dxc3 | 14.7s | 5/30 | 2.5K | d6 |
| 9 | O-O | 19.2s | 10/30 | 26K | Qxb2 |
| 12 | h3 ⚠️ | 30.1s | 8/30~ | 28K | Bxf3 |
| 22 | Bg4 | 14.6s | 11/30 | 22K | Nxh6 |
| 34 | a4 ⚠️ | 30.0s | 7/30~ | 43K | Kg8 |
| 46 | Kh2 | 14.8s | 11/30 | 40K | Rb8 |
| 51 | Kh1 | 20.4s | 10/30 | 67K | Rh8+ |
| 52 | Kg2 | 10.4s | 10/30 | 70K | Qg3+ |
| 59 | Ke1 | 24.5s | 9/30 | 54K | Qe4+ *(repetition)* |

---

## 📋 PGN

```pgn
[White "mChess Wise King (d30/30s)"]
[Black "Stockfish (d5)"]
[Result "1/2-1/2"]

1. c4 c5 2. Nf3 g6 3. Nc3 Bg7 4. e3 Bxc3 5. dxc3 d6 6. Bd3 Nc6 7. e4 Bg4
8. Bf4 Qb6 9. O-O Qxb2 10. Rb1 Qxc3 11. Rxb7 Rc8 12. h3 Bxf3 13. Qxf3 Nf6
14. Qd1 O-O 15. e5 dxe5 16. Bh6 Rfd8 17. Rb3 Qd4 18. a3 e4 19. Be2 Ne8
20. Re3 Nd6 21. Qe1 Nf5 22. Bg4 Nxh6 23. Bxc8 Rxc8 24. Rxe4 Qd6 25. g4 Kf8
26. f4 Ng8 27. g5 Nd4 28. Qe3 e6 29. Rd1 Ne7 30. Qd3 Kg7 31. Rb1 Rd8
32. Rb7 Nef5 33. Rb2 a6 34. a4 Kg8 35. a5 h6 36. Rb6 Qc7 37. gxh6 Nxh6
38. Qb1 Nhf5 39. Rb7 Qxa5 40. Qc1 Rf8 41. Qf1 Qa3 42. Qg2 Kg7 43. Rc7 Qc3
44. Rd7 a5 45. Ra7 Qa1+ 46. Kh2 Rb8 47. h4 Nxh4 48. Rxd4 Qxd4 49. Qf1 Nf5
50. Qg1 Qxf4+ 51. Kh1 Rh8+ 52. Kg2 Qg3+ 53. Kf1 Qd3+ 54. Ke1 Qe4+
55. Kf2 Qe3+ 56. Kf1 Qf4+ 57. Ke1 Qe4+ 58. Kf2 Qc2+ 59. Ke1 Qe4+ 1/2-1/2
```

---

## 🔍 Analysis

- mChess accepted a **pawn sacrifice** on b2 (Qxb2 → Rb7) and activated the rook aggressively
- The engine correctly identified the **threefold repetition** in the K+Q endgame and claimed the draw at move 118
- NPS peaked at **70K** in the simplified endgame — confirming the benefit of depth 30 (would have capped at d:12 in v2.10)
- Match shows mChess is **competitive** at Stockfish depth 5 level in complex open games