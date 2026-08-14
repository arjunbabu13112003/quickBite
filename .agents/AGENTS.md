# Workspace Rules

1. **Android 3-Button Navigation Support**:
   - Always automatically apply safe-area bottom inset handling (`useSafeAreaInsets().bottom` or fallback `initialWindowMetrics?.insets?.bottom`) for all bottom navigation bars, fixed bottom action buttons, item customizer popups, cart summary bars, and modals.
   - Never let bottom UI elements overlap or get covered by Android 3-button system navigation bars.

2. **Dual Theme Support (Dark & Light Mode)**:
   - Always design and implement all screens, modals, cards, popups, and components to support both **Dark Mode** and **Light (White) Mode**.
   - Use dynamic theme tokens (`D.bg`, `D.card`, `D.heading`, `D.text`, `D.textSub`, `D.chipBg`, `D.cardBorder`, `D.divider`, `D.headerBg`, `D.navBg`).
