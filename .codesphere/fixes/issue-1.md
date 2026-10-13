# Proposed Fix for Issue #1

### Root Cause & Approach
The login page container (`.auth-card` in `public/css/naayak.css`) has a fixed `width: 480px` and `min-height: 100vh`, causing overflow and layout crashes on viewports narrower than 480px (mobile devices). We will fix this by making the width responsive using max-width and percentage sizing with media queries.

### Proposed Code Fix

Update `public/css/naayak.css` around line 125:

```css
.auth-card {
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  background: var(--white);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem 2.5rem;
  position: relative;
  box-shadow: -10px 0 40px rgba(0,0,0,0.2);
}

@media (max-width: 480px) {
  .auth-card {
    padding: 2rem 1.25rem;
    box-shadow: none;
  }
}
```

### Verification
1. Open the login page in a desktop browser and verify the card maintains its standard appearance.
2. Toggle responsive/mobile device mode in browser developer tools (e.g., iPhone SE or Pixel viewports).
3. Confirm the card scales cleanly to fit the screen width without horizontal scrolling or clipping.

---
*Formulated by @SarthakSoni31 via CodeSphere AI*