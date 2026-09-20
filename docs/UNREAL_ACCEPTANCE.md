# Unreal acceptance checks

Status at delivery: **not run**. Unreal Editor is not installed in the inspected locations on the build machine. Static source checks and Blender round-trip checks do not prove Unreal compatibility.

Record the engine version, compiler, GPU and display resolution when completing these checks.

- Build `DOSExplorerEditor` successfully. Inspect the Output Log for import errors.
- Import and verify a footprint of approximately 2800 x 2400 cm, all ten sockets, and the expected custom collision count from `assets/scene_manifest.json`.
- Confirm imported materials, sign orientation, visible text, daylight and fill lighting. Inspect socket positions at the arrival and each kiosk. No Blender-to-Unreal axis conversion is hard-coded: the game uses imported sockets.
- Press Play: spawn at reception at standing height. Walk around the desk and through the gallery entrances. Walls, windows, counters, desks, seats and planters should block passage; doorways should remain open.
- Read all four exhibits with E. Check that movement stops while reading and resumes after E or Q. Verify the longest panel at 1280 x 720 and 1920 x 1080 without clipping.
- Choose a wrong answer, then the correct answer. Activities increase once per gallery. Reopening an exhibit must not increase completed counts.
- Press G repeatedly to visit all four galleries. Check orientation and that the visitor never appears in furniture. H returns to reception. Walk between all galleries without using G.
- Press F only when an exhibit is open. Verify that its official resource opens in the system browser. Network restrictions must not prevent continued offline play.
- Package a Windows Development build. Run it with internet disconnected: check office loading, collision, reading and activities, plus staged `Content/Data/exhibits.json`.
- Measure frame rate and memory on the intended visitor PC. No performance target has yet been certified. Tune renderer settings after measuring.

Known prototype limits: no actual office plan, ceiling enclosure, live statistics refresh, embedded SANDRA/Ask SingStat, spoken narration, VR, screen-reader UI, persistent progress or multiplayer. Some fine decorative geometry uses approximate collision. Content requires DOS editorial review before public release.
