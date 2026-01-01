# BanglePokeWalker

> > A fan made attempt at a \*faithful recreation of the PokeWalker on the Bangle.js 2 hackable smartwatch
>
> > ## MVP for Watch
> >
> > - Clock
> > - Alarm
> > - Calander
> > - On
> > - Off
> > - Settings
> >   - Brightness
> >   - Contrast
> >   - Theme
> >     - Light
> >     - Dark
> >   - Volume (Buzz level on Bangle.js 2)
>
> > ## MVP for BanglePokeWalker
> >
> > > ### Contents
> > >
> > > - Home
> > > - Menu
> > > - Radar
> > > - Dowsing
> > > - Trainer Card
> > > - Settings
> >
> > > #### Home screen
> > >
> > > - Main screen for app
> > > - Pressing the side button on the watcch (hereon equivilent to 'CENTER' on the PokeWalker) opens 'Main Menu'
> > > - Touching and holding the right and left hand sides of the screen puts the Walker in "Sleep Mode"
> > > - Displaying chosen or loaded Pokemon sprite
> > > - The Route sprite for the route selected by the user in the route menu
> > > - Total Steps accumulated by the user
> > > - Over a 24h period
> > > - Steps are added to step total found in Trainer Card
> > > - Resets to 0 at Midnight
> > > - Total Watts(W) accumulated by the user
> > > - Every 20 steps = 1W
> > > - Watts do _not_ reset every 24h
> > > - Watts are subtracted when Radar or Dowsing Machine are used
> >
> > > #### Menu Screen
> > >
> > > - A menu displaying all the different app functions
> > >   - Back Button to return Home
> > > - Radar
> > > - Dowsing
> > > - Connect
> > > - Trainer Card
> > > - Inventory
> > > - Settings
> >
> > > #### PokeRadar
> > >
> > > - Requires 10W to play
> > > - Search Mode
> > > - Presents the user with a set of 4 patches of grass
> > >   - User can select 1 patch per radar usage
> > >   - one patch at random will contain a Pokemon that is found on that route
> > > - Battle Mode
> > > - If a Pokemon is found in a patch of grass "Battle Mode" is triggered
> > > - screen transitions from Radar Search to Radar Battle
> > > - The wild Pokemon is revealed with a 4 piece HP bar
> > >   - The Players Pokemon is drawn with a 4 piece HP bar and animates across the screen to oppose the wild Pokemon
> > >   - A simple battle menu is displayed showing the Player 3 options to choose from
> > >     - Attack
> > >       - Miss
> > >       - Hit
> > >         - Critical Hit
> > >         - Evaded
> > >       - Evade
> > >       - Success
> > >         - Fail
> > >       - Catch
> > >         - Success
> > >         - Wild Pokemon Broke Free
> > >           - Wild Pokemon stays
> > >           - Wild Pokemon flees
> >
> > > #### Dowsing Machine
> > >
> > > - Requires 3W to play
> > > - Screen Displaying 6 patches of grass the user may select form if meeting the Watt requirement
> > > - One of the patches may contain an item the player can store in their inventory
> > > - Each time a patch of grass is searched
> > >   - 3W is subtracted from the users total watts
> > >   - Item is either revealed or the Player is alerted that the item is nearby
> > >   - If nearby player has a chance to choose from the two patches adacent to the previously selected patch
> >
> > > #### Trainer Card
> > >
> > > - Shows Player info
> > > - Name
> > > - Chosen route name
> > > - Local time
> > > - Pressing Right shows total steps the user has made while using the device
> > > - Sum total of every 24h period
> > > - Current 24h total
> > > - Button to reset step count
> > > - Max total 9,999,999
> >
> > > #### Inventory
> > >
> > > - Displays two selections
> > > - Items Icon
> > >   - Clicking shows a list of up to 5 items the player has found while using the Dowsing Machine on the Pokewalker
> > > - Pokemon Icon
> > >   - Clicking shows a list of up to 3 Pokemon the player has found while using the POKeRADAR
> >
> > > #### Settings
> > >
> > > - Displays two selections
> > > - Sound (bangle buzz level)
> > > - Contrast (bangle brightness + contrast)
> >
> > > ##### Golden Goal
> > >
> > > connect BanglePokeWalker with an (also yet to be made) emulator bridge to pair the watch with your favorite emulator to use the watch app to enhance and expand gameplay to be more genuine to the original experience.
> >
> > > ## BanglePokeWalker Development Roadmap
> > >
> > > I will link other README files and resources as they are created (if needed) for the different parts of the project here. Simply follow the links to find out where each part of the project is at any given time.
> > >
> > > There is an additional little side project in this repo to create an emulator for the espruino environment to run Bangle.js 2 apps on the PC in VSCode. This is not a priority for the BanglePokeWalker project but may be useful for development and testing. Would be a cool vscode extension as well if expanded to emulate more than just the Bangle.js 2.
> > >
> > > > From the root of the repository it can be found [here](./tools/emulator/) /tools/emulator and the README is [here](./tools/emulator/README.md)
> > >
> > > ### 1. Core Watch App (Bangle.js / JavaScript)
> > >
> > > - [ ] **Pedometer Engine**:
> > >   - [ ] **PE**: Get steps data from `Bangle.on('step')`.
> > >   - [ ] **PE**: Filter noise/movements to mimic Pokéwalker step counting.
> > >   - [ ] **PE**: Test step accuracy with real-world walking.
> > >   - [ ] **PE**: Explore path to send steps to phone for health apps.
> > > - [ ] **Watt Accumulation**:
> > >   - [ ] **WA**: Implement logic (e.g., 20 steps = 1 Watt).
> > >   - [ ] **WA**: Correctly subtracts for using the Radar and Dowsing Machine.
> > > - [ ] **1-Bit UI/UX**: Build 96x64 style LCD interface & animations._may just utilize full 176x176 to keep things sized nicely - will also need changes to the layout and potentially scaling_
> > > - [ ] **Mini-games**: Logic for Poké Radar and Dowsing Machine.
> > > - [ ] **Data Persistence**: Save steps/Watts/Pokémon ID to `Storage`.
> > >
> > > ### 2. Connectivity & Emulation Bridge
> > >
> > > - [ ] **BLE Comm Handler**: Send JSON packets via `Bluetooth.println()`.
> > > - [ ] **Mobile/PC Bridge**: Setup Tasker/Gadgetbridge or Python Bleak script.
> > > - [ ] **Save Injection**: Logic to edit `.sav` files for MelonDS/Citra/Drastic.
> > > - [ ] **RAM Sync**: (Advanced) Live memory injection for steps.
> > >
> > > ### 3. Gameplay Logic (1:1 Features)
> > >
> > > - [ ] **Transfer In/Out**: BLE handshake to move Pokémon to/from watch.
> > > - [ ] **Route System**: Route unlock logic based on total Watts.
> > > - [ ] **Encounter Tables**: Route-specific Pokémon and Item pools.
> > > - [ ] **Haptics**: `Bangle.buzz()` for "!" alert notifications.
> > >
> > > ### 4. Repo & Documentation
> > >
> > > - [ ] **App Loader Ready**: Finalize `metadata.json` and `app.js` structure.
> > > - [ ] **Memory Map Doc**: Document HG/SS save offsets for sync.
> > > - [ ] **README Update**: Add emulator setup and bridge instructions.
> > >
> > > ### 5. Optimization
> > >
> > > - [ ] **Power Management**: LCD timeout and low-power background polling.
> > > - [ ] **Web Bluetooth App**: Web-based dashboard for easy "Stroll" starts.
