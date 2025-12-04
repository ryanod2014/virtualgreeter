# Aura Financial Style Guide
## Complete Design System for React Implementation

**Reference Site:** [https://aura-financial.aura.build/](https://aura-financial.aura.build/)

---

## Table of Contents
1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Buttons](#buttons)
4. [Cards & Containers](#cards--containers)
5. [Navigation](#navigation)
6. [Layout & Spacing](#layout--spacing)
7. [Backgrounds & Effects](#backgrounds--effects)
8. [Icons & Assets](#icons--assets)
9. [Component Specifications](#component-specifications)
10. [CSS Variables](#css-variables)
11. [Animations & Transitions](#animations--transitions)

---

## Color Palette

### Primary Colors
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Background Primary** | `#030303` | `rgb(3, 3, 3)` | Main page background |
| **Background Card** | `#0A0A0A` | `rgb(10, 10, 10)` | Card backgrounds |
| **Accent Cyan** | `#38BDF8` | `rgb(56, 189, 248)` | Primary accent, hero text, highlights |
| **CTA Cyan** | `#22D3EE` | `rgb(34, 211, 238)` | CTA section background |
| **White** | `#FFFFFF` | `rgb(255, 255, 255)` | Primary buttons, headings |
| **Black** | `#000000` | `rgb(0, 0, 0)` | Button text on white backgrounds |

### Text Colors
| Name | Value | Usage |
|------|-------|-------|
| **Text Primary** | `#FFFFFF` | Main headings, prominent text |
| **Text Secondary** | `rgba(255, 255, 255, 0.7)` | Body paragraphs |
| **Text Tertiary** | `rgba(255, 255, 255, 0.5)` | Navigation links, subtle text |
| **Text Muted** | `rgba(255, 255, 255, 0.4)` | Labels, metadata, badges |
| **Button Text Light** | `#CBD5E1` | `rgb(203, 213, 225)` | Secondary button text |

### Border Colors
| Name | Value | Usage |
|------|-------|-------|
| **Border Subtle** | `rgba(255, 255, 255, 0.1)` | Card borders, dividers |
| **Border Focus** | `rgba(255, 255, 255, 0.2)` | Hover states |

### Status Colors
| Name | Hex | Usage |
|------|-----|-------|
| **Success/Active** | `#22C55E` (green) | Status indicators ("Network Active", "System Status") |
| **Positive Change** | `#38BDF8` (cyan) | Positive percentage changes (+2.4%) |

---

## Typography

### Font Families

```css
/* Primary Sans-Serif (Body, UI elements) */
--font-sans: 'Inter', system-ui, -apple-system, sans-serif;

/* Serif Display (Headlines) */
--font-serif: 'Newsreader', Georgia, serif;

/* Monospace (Labels, badges, technical text) */
--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

### Font Import (Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap" rel="stylesheet">
```

### Heading Styles

#### H1 - Hero Headlines
```css
h1 {
  font-family: 'Newsreader', serif;
  font-size: 72px;
  font-weight: 400;
  font-style: italic;
  color: #38BDF8; /* Cyan accent */
  line-height: 1.1;
}

/* Responsive */
@media (max-width: 768px) {
  h1 { font-size: 48px; }
}
```

#### H2 - Section Headlines
```css
h2 {
  font-family: 'Newsreader', serif;
  font-size: 72px;
  font-weight: 500;
  font-style: normal; /* Some h2s use italic */
  color: #FFFFFF;
  line-height: 1.1;
}

/* Variant: Italic parts */
h2 em, h2 .italic {
  font-style: italic;
  color: rgba(255, 255, 255, 0.6);
}

@media (max-width: 768px) {
  h2 { font-size: 42px; }
}
```

#### H3 - Card/Feature Titles
```css
h3 {
  font-family: 'Inter', sans-serif;
  font-size: 24px;
  font-weight: 600;
  color: #FFFFFF;
  line-height: 1.3;
}
```

#### H4 - Labels/Badges (Monospace)
```css
h4, .label {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 2.4px; /* Wide tracking */
  text-transform: uppercase;
}
```

### Body Text
```css
p, .body-text {
  font-family: 'Inter', sans-serif;
  font-size: 18px; /* Hero: 24px */
  font-weight: 400;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.6; /* Hero paragraph: 32px line-height */
}

.body-large {
  font-size: 24px;
  line-height: 32px;
}
```

---

## Buttons

### Primary Button (Solid White)
```css
.btn-primary {
  background-color: #FFFFFF;
  color: #000000;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 9999px; /* Full rounded */
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: rgba(255, 255, 255, 0.9);
  transform: translateY(-1px);
}
```

### Secondary Button (Ghost/Outline)
```css
.btn-secondary {
  background-color: rgba(255, 255, 255, 0.05);
  color: #CBD5E1;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 12px 24px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}
```

### Tertiary Button (Gradient Border - Hero)
```css
.btn-tertiary {
  position: relative;
  background: linear-gradient(135deg, #38BDF8, #818CF8);
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  padding: 14px 28px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
}

/* Inner content with dark background */
.btn-tertiary::before {
  content: '';
  position: absolute;
  inset: 2px;
  background: #030303;
  border-radius: 9999px;
  z-index: 0;
}

.btn-tertiary span {
  position: relative;
  z-index: 1;
}
```

### Button with Arrow Icon
```jsx
<button className="btn-primary">
  Start Engine
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 8H12M12 8L8 4M12 8L8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
</button>
```

---

## Cards & Containers

### Feature Card (Dark)
```css
.card {
  background-color: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 32px;
  padding: 32px;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.04);
}
```

### Inner Card/Widget (Darker)
```css
.card-inner {
  background-color: #0A0A0A;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}
```

### Glass Card (Navbar style)
```css
.card-glass {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}
```

### CTA Section Card
```css
.cta-section {
  background: linear-gradient(180deg, #22D3EE 0%, #38BDF8 100%);
  border-radius: 32px;
  padding: 64px;
  position: relative;
  overflow: hidden;
}

/* Ripple/wave pattern overlay */
.cta-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/path-to-ripple-pattern.svg');
  opacity: 0.3;
}
```

---

## Navigation

### Fixed Header with Glassmorphism
```css
nav {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 8px 8px 8px 20px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.5);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: rgba(255, 255, 255, 0.9);
}
```

### Logo Component
```jsx
<div className="logo">
  <img src="/logo-icon.svg" alt="Aura" width="24" height="24" />
  <span className="logo-text">Aura</span>
</div>
```

```css
.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-family: 'Inter', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: #FFFFFF;
}
```

---

## Layout & Spacing

### Container
```css
.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (min-width: 1536px) {
  .container {
    max-width: 1400px;
  }
}
```

### Section Spacing
```css
section {
  padding: 120px 0;
}

@media (max-width: 768px) {
  section {
    padding: 80px 0;
  }
}
```

### Spacing Scale
```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-32: 128px;
}
```

### Grid Layouts
```css
/* 3-Column Feature Grid */
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

/* First card spans 2 rows */
.feature-grid .card:first-child {
  grid-row: span 2;
}

@media (max-width: 1024px) {
  .feature-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .feature-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## Backgrounds & Effects

### Hero Background
The hero features a dark background with:
1. **Base color:** `#030303` (near black)
2. **Animated 3D blob/shape:** Cyan/blue glowing form (implemented via Unicorn Studio or Three.js)
3. **Grid pattern overlay:** Fine blue dots/grid

```css
.hero {
  position: relative;
  min-height: 100vh;
  background-color: #030303;
  overflow: hidden;
}

/* Grid pattern overlay */
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle at 1px 1px, rgba(56, 189, 248, 0.15) 1px, transparent 0);
  background-size: 40px 40px;
  pointer-events: none;
}

/* Cyan glow effect */
.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, transparent 70%);
  filter: blur(80px);
  animation: pulse 8s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.1); }
}
```

### Section Backgrounds
```css
/* Gradient background section */
.section-gradient {
  background: linear-gradient(
    180deg,
    rgba(56, 189, 248, 0.05) 0%,
    transparent 50%
  );
}

/* Dark section with border top */
.section-dark {
  background: #030303;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## Icons & Assets

### Icon Style
- **Style:** Line/outline icons (not filled)
- **Stroke width:** 1.5px - 2px
- **Color:** Inherit from parent (usually white or cyan)
- **Size:** 16px - 24px for UI, 24px - 32px for feature icons

### Recommended Icon Libraries
- **Heroicons** (Tailwind's icon set)
- **Lucide React**
- **Feather Icons**

### Icon with Circle Background
```jsx
<div className="icon-badge">
  <svg>...</svg>
</div>
```

```css
.icon-badge {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 12px;
  color: #38BDF8;
}
```

### Status Indicator (Dot)
```css
.status-dot {
  width: 8px;
  height: 8px;
  background-color: #38BDF8;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

---

## Component Specifications

### Hero Section
```jsx
<section className="hero">
  <div className="hero-glow" />
  <nav>...</nav>
  <div className="container">
    <div className="hero-content">
      <div className="status-badge">
        <span className="status-dot" />
        <span>SYSTEM OPERATIONAL</span>
      </div>
      <h1>
        <em>Architect your wealth</em><br />
        <em>with absolute precision.</em>
      </h1>
      <p className="body-large">
        Advanced financial protocols merged with intuitive design...
      </p>
      <div className="button-group">
        <button className="btn-tertiary">Initialize Protocol</button>
        <button className="btn-secondary">
          View Ecosystem
          <ArrowRightIcon />
        </button>
      </div>
    </div>
    <div className="floating-labels">
      <span>ZERO LATENCY</span>
      <span>DEFI NATIVE</span>
    </div>
  </div>
  <div className="trust-bar">
    <div className="logos">...</div>
    <span>[ ✓ ] TRUSTED BY INDUSTRY LEADERS</span>
  </div>
</section>
```

### Feature Card with Demo UI
```jsx
<div className="card">
  <h3>Automated Execution</h3>
  <p>Generate high-yield strategies and execute trades...</p>
  <div className="card-inner">
    <div className="demo-header">AURA_OS v2.1</div>
    <div className="demo-content">
      <p className="demo-message">Initialize rebalancing for Portfolio Alpha...</p>
      <div className="demo-response">
        <div className="avatar" />
        <span>Aura Protocol</span>
      </div>
      <p>Analyzing liquidity depth across 4 exchanges...</p>
      <div className="demo-status">
        <span className="status-executing">EXECUTING</span>
        <span className="amount">$52,400.00</span>
      </div>
    </div>
  </div>
</div>
```

### Testimonial Section
```jsx
<section className="testimonial">
  <div className="testimonial-header">
    <span className="label">BUILT FOR THE HYBRID ECONOMY</span>
    <h2>
      <em>The modern investor doesn't fit in a single market</em> — 
      they stake, they hedge, they compound smart. 
      <em>This protocol was made for them.</em>
    </h2>
  </div>
  <div className="testimonial-content">
    <div className="testimonial-image">
      <img src="..." alt="Trader Profile" />
      <span className="live-badge">LIVE</span>
    </div>
    <blockquote>
      <p>"I used to track my positions in one terminal..."</p>
    </blockquote>
    <div className="testimonial-stats">
      <span>PORTFOLIO VOLUME UP <strong>17%</strong> SINCE INCEPTION</span>
      <button className="btn-secondary">Start Investing</button>
    </div>
  </div>
</section>
```

### Footer
```jsx
<footer>
  <div className="container">
    <div className="footer-grid">
      <div className="footer-brand">
        <div className="logo">...</div>
        <p>Engineering the bedrock of the programmable economy...</p>
        <div className="social-links">
          <a href="#"><XIcon /></a>
          <a href="#"><GitHubIcon /></a>
          <a href="#"><LinkedInIcon /></a>
          <a href="#"><DiscordIcon /></a>
        </div>
      </div>
      <div className="footer-links">
        <h4>Protocol</h4>
        <ul>
          <li><a href="#">Documentation</a></li>
          <li><a href="#">API Reference</a></li>
          <li><a href="#">Governance</a></li>
          <li><a href="#">System Status <span className="status-dot" /></a></li>
        </ul>
      </div>
      <div className="footer-links">
        <h4>Company</h4>
        <ul>...</ul>
      </div>
      <div className="footer-cta">
        <a href="#" className="footer-card">
          <span>Contact Sales</span>
          <ArrowIcon />
        </a>
        <a href="#" className="footer-card">
          <span>Help Center</span>
          <ArrowIcon />
        </a>
      </div>
    </div>
    <div className="footer-bottom">
      <span>© 2024 Aura Financial Technologies. All rights reserved.</span>
      <div className="compliance">
        <img src="/stripe.svg" alt="Stripe" />
        <img src="/visa.svg" alt="Visa" />
        <span>SOC2 Type II Compliant</span>
      </div>
    </div>
  </div>
</footer>
```

---

## CSS Variables (Complete)

```css
:root {
  /* Colors */
  --color-bg-primary: #030303;
  --color-bg-secondary: #0A0A0A;
  --color-bg-card: rgba(255, 255, 255, 0.02);
  --color-bg-card-hover: rgba(255, 255, 255, 0.04);
  --color-bg-button-secondary: rgba(255, 255, 255, 0.05);
  
  --color-accent: #38BDF8;
  --color-accent-light: #22D3EE;
  
  --color-text-primary: #FFFFFF;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-text-tertiary: rgba(255, 255, 255, 0.5);
  --color-text-muted: rgba(255, 255, 255, 0.4);
  --color-text-button-secondary: #CBD5E1;
  
  --color-border: rgba(255, 255, 255, 0.1);
  --color-border-hover: rgba(255, 255, 255, 0.2);
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Newsreader', Georgia, serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  
  /* Sizing */
  --text-xs: 12px;
  --text-sm: 14px;
  --text-base: 16px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  --text-5xl: 48px;
  --text-6xl: 60px;
  --text-7xl: 72px;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-card: 0 25px 50px rgba(0, 0, 0, 0.25);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.3s ease;
}
```

---

## Animations & Transitions

### Hover Effects
```css
/* Card hover lift */
.card {
  transition: transform var(--transition-slow), 
              border-color var(--transition-base),
              background-color var(--transition-base);
}

.card:hover {
  transform: translateY(-4px);
}

/* Button hover */
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(255, 255, 255, 0.1);
}
```

### Page Load Animations
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-in {
  animation: fadeInUp 0.6s ease forwards;
}

/* Stagger delays */
.animate-in:nth-child(1) { animation-delay: 0ms; }
.animate-in:nth-child(2) { animation-delay: 100ms; }
.animate-in:nth-child(3) { animation-delay: 200ms; }
.animate-in:nth-child(4) { animation-delay: 300ms; }
```

### Scroll-triggered Animations
Consider using:
- **Framer Motion** for React
- **GSAP ScrollTrigger**
- **Intersection Observer API**

---

## Tailwind CSS Configuration (If Using Tailwind)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        background: '#030303',
        'background-secondary': '#0A0A0A',
        accent: '#38BDF8',
        'accent-light': '#22D3EE',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        '4xl': '32px',
      },
      backdropBlur: {
        '3xl': '24px',
      },
    },
  },
}
```

---

## Key Design Principles

1. **Dark Mode First:** The entire design is dark-themed with near-black backgrounds
2. **Elegant Typography Contrast:** Serif italic headlines vs. clean sans-serif body
3. **Accent Sparingly:** Cyan (#38BDF8) used as primary accent - don't overuse
4. **Subtle Gradients:** Backgrounds use very subtle opacity gradients
5. **Glass Effects:** Navigation and some cards use frosted glass (backdrop-blur)
6. **Generous Whitespace:** Large section padding, breathing room between elements
7. **Rounded Everything:** Full-radius (pill) buttons, large border-radius on cards
8. **Status Indicators:** Small animated dots and labels show "live" system status
9. **Professional Trust Signals:** Payment badges, compliance logos in footer

---

## Implementation Checklist

- [ ] Set up fonts (Inter + Newsreader from Google Fonts)
- [ ] Configure color variables/theme
- [ ] Build navigation component with glass effect
- [ ] Create button variants (primary, secondary, tertiary)
- [ ] Build card components
- [ ] Implement hero section with background effects
- [ ] Create feature grid layout
- [ ] Build testimonial section
- [ ] Implement CTA section with gradient background
- [ ] Build footer with link columns
- [ ] Add scroll animations
- [ ] Test responsive breakpoints
- [ ] Verify typography hierarchy
- [ ] Add hover/focus states

---

*This style guide was extracted from [https://aura-financial.aura.build/](https://aura-financial.aura.build/)*

