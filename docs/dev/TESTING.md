# Testing Guide

## Running Tests

### Unit Tests

```bash
npm test              # Run all unit tests once
npm run test:ui       # Open Vitest UI
npm run test:coverage # Generate coverage report
```

### E2E Tests

```bash
npx playwright test                    # Run all browsers
npx playwright test --project=chromium # Chromium only
npx playwright test --project=firefox  # Firefox only
npx playwright test --project=webkit   # Safari/WebKit only
npx playwright test --headed           # Show browser UI
npx playwright show-report             # View HTML report
```

## Performance Testing

### Bundle Size Analysis

Check production bundle size:

```bash
npm run build
```

Look for output like:

```
dist/assets/index-[hash].js   XXX.XX kB │ gzip: XXX.XX kB
dist/assets/index-[hash].css   XX.XX kB │ gzip:   X.XX kB
```

**Target metrics:**

- Total gzipped JS+CSS: <200 kB
- Initial load time: <3s on 3G

### Load Time Testing

Using a local server:

```bash
cd dist && python3 -m http.server 8000
```

Then measure with curl:

```bash
curl -o /dev/null -s -w "Time: %{time_total}s\n" http://localhost:8000/
```

Or use browser DevTools:

1. Open DevTools → Network tab
2. Disable cache
3. Throttle to "Fast 3G"
4. Reload page
5. Check "Load" time in bottom status bar

### Lighthouse Audit

```bash
npm run build
npx serve dist -l 8000
npx lighthouse http://localhost:8000 --view
```

**Target scores:**

- Performance: >90
- Accessibility: 100
- Best Practices: 100
- SEO: >90

## Browser Compatibility Testing

### Automated Cross-Browser Tests

Playwright tests run on:

- **Chromium** (Chrome, Edge, Opera, Brave)
- **Firefox**
- **WebKit** (Safari)

```bash
npx playwright test --project=chromium,firefox,webkit
```

### Manual Browser Testing Checklist

Test these scenarios in each browser:

#### Core Functionality

- [ ] Load app and see default state
- [ ] Edit claim and details
- [ ] Select different stakes options
- [ ] Add/remove participants (min 2, max 8)
- [ ] Add/remove outcomes (min 2, max 8)
- [ ] Adjust probability sliders
- [ ] Enter probability values manually
- [ ] Use "Normalize" button when totals ≠ 100%
- [ ] Resolve wager to an outcome
- [ ] View payout calculations
- [ ] View settlement instructions

#### Sharing & State

- [ ] Click "Share Wager" → URL updates
- [ ] Copy URL and paste in new tab → state restored
- [ ] Modify shared wager → new URL generated
- [ ] Click "Reset Form" → confirmation dialog → resets to defaults

#### PWA Features

- [ ] Install as PWA (browser install prompt)
- [ ] Launch installed app
- [ ] Use app offline (after first load)
- [ ] Update app when new version available

#### Accessibility

- [ ] Navigate entire form with keyboard only (Tab, Enter, Arrow keys)
- [ ] Use screen reader (verify labels are announced)
- [ ] Test with 200% zoom (text remains readable)
- [ ] Check color contrast in light/dark mode

#### Responsive Design

- [ ] Test on mobile viewport (320px width)
- [ ] Test on tablet viewport (768px width)
- [ ] Test on desktop viewport (1920px width)
- [ ] Rotate device (portrait ↔ landscape)

#### Edge Cases

- [ ] Enter very large bet amounts (999999999)
- [ ] Enter very small probabilities (0.01%)
- [ ] Create wager with max participants (8)
- [ ] Create wager with max outcomes (8)
- [ ] Use special characters in claim/details/names
- [ ] Test with slow network (throttle to 3G)

### Browser-Specific Issues to Watch For

**Safari/WebKit:**

- Date/time formatting
- Service worker registration
- Clipboard API permissions
- CSS backdrop-filter support

**Firefox:**

- Input number spinner behavior
- Focus ring styling
- Service worker update prompts

**Mobile Browsers (Chrome/Safari):**

- Touch target sizes (min 44x44px)
- Scroll behavior
- Virtual keyboard overlap
- Pull-to-refresh conflicts

## Accessibility Testing

### Automated Scans

Playwright accessibility tests use axe-core:

```bash
npx playwright test e2e/accessibility.spec.ts
```

### Manual Keyboard Navigation

All interactive elements should be reachable via:

- **Tab**: Move forward
- **Shift+Tab**: Move backward
- **Enter/Space**: Activate buttons
- **Arrow keys**: Navigate within components (dropdowns, listboxes)

### Screen Reader Testing

**macOS (VoiceOver):**

```bash
Cmd+F5  # Toggle VoiceOver
```

**Windows (NVDA - free):**
Download from https://www.nvaccess.org/

**Linux (Orca):**

```bash
sudo apt install orca
orca --replace
```

Verify:

- All form inputs have labels
- Buttons describe their action
- Error messages are announced
- Dynamic content changes are announced

### Color Contrast

Check text meets WCAG AA standards (4.5:1 ratio):

```bash
# Use browser DevTools → Inspect → Accessibility pane
# Or online tool: https://webaim.org/resources/contrastchecker/
```

## Continuous Integration

E2E tests run automatically on:

- Pull requests
- Pushes to main branch
- Scheduled daily runs

See [.github/workflows/](../../.github/workflows/) for CI configuration.
