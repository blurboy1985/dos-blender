# DOS Discovery Office — hosted browser experience

The hosted version uses the original Blender office geometry with Three.js. Start by choosing a name, gender, hairstyle, clothing, skin colour and clothing/hair colours. Avatars are procedural full-body models with walking animation; the camera follows behind and above them and checks the scene's collision boxes.

Four stylised virtual officers sit at desks in the galleries. Approach one and press **T**, or use **Find this gallery's officer** from the exhibit. The contact panel opens the supplied [SANDRA page](https://www.singstat.gov.sg/chatwithsandra-beta) or an email draft addressed to **info@singstat.gov.sg**. The email includes the chosen enquiry/feedback category, gallery and visitor-entered message. The site itself does not send messages or imply live officer availability.

The original Blender/Unreal download is labelled separately; these avatar and contact changes apply to the hosted browser application.

## Windows PowerShell

```powershell
npm ci
npm run dev
node --test tests/contacts.test.js
npm run build
```

Edit `public/assets/contacts.json` to change the gallery contacts. A gallery inherits the default unless it overrides a field. Avatar settings and contact drafts are held in memory for the current visit, not saved to a server. The SANDRA link does not receive the visitor's draft or avatar details.

Controls: WASD/arrows walk; drag turns the follow camera; scroll adjusts follow distance; E reads an exhibit; T opens an officer contact panel; G visits the next gallery; H returns to reception. Mobile controls include directional buttons and a collapsible gallery menu.

## Avatar and wall display update

Gender offers Man and Woman. Each has four hairstyles and three clothing styles; the Random avatar button chooses a valid combination and colours, preserving an entered name or using Visitor when blank. `src/avatar-options.js` holds the options and randomiser.

Four framed SVG wall displays are bundled locally and can be enlarged from each gallery. The images are original designs using dated SingStat facts/guidance, not live data feeds:

- Population Trends 2025: end-June population 6.11 million; 1.2% annual increase.
- HES 2023, Ownership of Consumer Durables: household internet subscriptions in 2012/13, 2017/18 and 2023; selected household items in 2023.
- SSOC 2024: a simplified diagram of occupational classification hierarchy.

Exact source links and accessible descriptions are in `src/wall-displays.js`. SVG assets are under `public/assets/walls/`. The original unframed bars in the Blender geometry remain illustrative.

Validation: production build and contact URL tests passed; desktop and 390x844 mobile flows exercised. Forty randomisations retained the visitor name and valid style choices. All four gallery images decoded and officer contact destinations were checked without sending messages.

## Mobile controls

Visible camera controls offer zoom in/out, left/right turn and reset in both walking and floor-plan modes. Pinch zoom is available on the scene; hold the directional buttons to walk and release to stop. Camera collision can shorten the chosen viewing distance near walls. The mobile layout uses larger targets, safe-area spacing, portrait/landscape layouts, a scrollable gallery menu and a sticky avatar start button. Source downloads remain available in the visitor guide.

Validation used browser touch events at 390x844 for button zoom, pinch, turning, reset, walking/release and floor-plan zoom. Rendered layouts were also checked at 320x568, 844x390 and 1440x900. Desktop mouse/keyboard controls remain available.
