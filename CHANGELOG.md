# Changelog

## [2.3.0](https://github.com/Amayyas/ChessTrainer/compare/v2.2.0...v2.3.0) (2026-09-12)


### Features

* **home:** give the landing band an inverted palette and real buttons ([94433b2](https://github.com/Amayyas/ChessTrainer/commit/94433b258534942d3594d2ef50f004c8a31f1e90))
* **layout:** give every page the site footer, not just the landing ([eba1e9b](https://github.com/Amayyas/ChessTrainer/commit/eba1e9b03f894c9083a7742e71445f2122a7221e))
* **layout:** one site footer, on every page ([b16e802](https://github.com/Amayyas/ChessTrainer/commit/b16e80269a40fb0350b3a749738cb52c027a96c1))
* **nav:** open the whole navigation from the mobile bottom bar ([cf0d92d](https://github.com/Amayyas/ChessTrainer/commit/cf0d92d522790fd99577a36c142ea19fe27a1c31))
* **puzzle:** make the mode switch a real set of tabs ([1a34b77](https://github.com/Amayyas/ChessTrainer/commit/1a34b77da989f80082470a9139925c2e5003001c))
* **ui:** migrate the design system to shadcn/ui ([b943374](https://github.com/Amayyas/ChessTrainer/commit/b9433746ba3a18dc21f93bca3df116bc9f45bff6))


### Bug Fixes

* **layout:** make the footer a real landmark, and cover it with a test ([cd89824](https://github.com/Amayyas/ChessTrainer/commit/cd89824009f8bb7f26af5dcd8166e4457babebae))
* **layout:** pin the footer to the bottom of short pages ([7bbd2d2](https://github.com/Amayyas/ChessTrainer/commit/7bbd2d27324246a9c2e517e35e365888603753e3))
* **ui:** repair what the review found, starting with every button's hover ([9821497](https://github.com/Amayyas/ChessTrainer/commit/9821497b2663fe18ddee961d3fbaf8b9149c0f79))


### Refactoring

* **battle:** make the pre-game settings drivable from the keyboard ([be5496c](https://github.com/Amayyas/ChessTrainer/commit/be5496ce09365cec3f86dd808322261e10133e03))
* **layout:** move the legal links out of the sidebar into the page footer ([79f4369](https://github.com/Amayyas/ChessTrainer/commit/79f4369a6601973f0c6c886e4a06a409db531c5a))
* **leaderboard:** make the filters drivable from the keyboard ([5145e4e](https://github.com/Amayyas/ChessTrainer/commit/5145e4e8db76d8c8fbd970bef0dd4f0bf346f419))
* **nav:** give the sidebar the design system's button and a real rule ([b1319e4](https://github.com/Amayyas/ChessTrainer/commit/b1319e42eaff076ccede057f7e7419f8dff55570))
* **ui:** finish the single-choice groups on the remaining pages ([aca3b13](https://github.com/Amayyas/ChessTrainer/commit/aca3b1379c877dd611356b5813de849362dfa7f6))
* **ui:** move the card, the badge and the dialog onto shadcn ([1c72e66](https://github.com/Amayyas/ChessTrainer/commit/1c72e662d512b9f6b780c15101ccd51e1bb862b5))
* **ui:** rebuild the button on the shadcn structure ([261855a](https://github.com/Amayyas/ChessTrainer/commit/261855aaa6c3d46754fe9bff9c246074ae781897))

## [2.2.0](https://github.com/Amayyas/ChessTrainer/compare/v2.1.0...v2.2.0) (2026-09-11)


### Features

* **engine:** recalibrate battle levels 1 and 2 ([8196ebd](https://github.com/Amayyas/ChessTrainer/commit/8196ebd5fd49c36d0657b9032faec1d74aab23c7))
* **engine:** recalibrate battle levels 1 and 2 (SF18 stage 3) ([a9e8567](https://github.com/Amayyas/ChessTrainer/commit/a9e8567eda0495e8139657532a2ec2c426f03c68))
* **progression:** remember which puzzles have been solved ([f2c2a67](https://github.com/Amayyas/ChessTrainer/commit/f2c2a67cb2c32b40f9997070fbb6bd01d554ad36))
* **puzzle:** add a free practice mode ([8d6b973](https://github.com/Amayyas/ChessTrainer/commit/8d6b973e8093692e2061c5507596242d46478e2c))
* **puzzle:** draw the daily series from unseen puzzles first ([7b7ad7a](https://github.com/Amayyas/ChessTrainer/commit/7b7ad7af943fd9751ebd3f4b477e8b617c7e4517))
* **puzzle:** free practice mode ([b6fcf06](https://github.com/Amayyas/ChessTrainer/commit/b6fcf06c46a0c40502f37e1ae71376e9af6fdc9d))
* **puzzle:** give tactical motifs their own French labels ([e9afa36](https://github.com/Amayyas/ChessTrainer/commit/e9afa3632fed8e6f325e3fa5cb44d4b892c37e05))
* **puzzle:** import puzzles from the Lichess Open Database ([14a047d](https://github.com/Amayyas/ChessTrainer/commit/14a047df2cf38303c0be5949ffe0f71aa006ee80))
* **puzzle:** spread the daily series across the rating range ([3beec66](https://github.com/Amayyas/ChessTrainer/commit/3beec66ebbf562b1393f3ca87e8ad6b66657cd3f))


### Bug Fixes

* **puzzle:** accept an alternative mating move on the final ply ([2e28903](https://github.com/Amayyas/ChessTrainer/commit/2e2890315b292c878163448b9bdd29ffa61bd811))


### Refactoring

* **puzzle:** move solve recording into usePuzzleSession ([59df0ed](https://github.com/Amayyas/ChessTrainer/commit/59df0eda9e14b69eaf612eae29e249f8d81a3f40))
* **puzzle:** move the streak helpers out of dailySet ([2414912](https://github.com/Amayyas/ChessTrainer/commit/2414912c937d0f78c8a1cb30c89f80d68cf340d1))

## [2.1.0](https://github.com/Amayyas/ChessTrainer/compare/v2.0.1...v2.1.0) (2026-09-09)


### Features

* **engine:** calibrate battle difficulty with Stockfish 18's UCI_Elo ([bdf84e9](https://github.com/Amayyas/ChessTrainer/commit/bdf84e9869efc46b747402deb6b809b5d6fe5460))

## [2.0.1](https://github.com/Amayyas/ChessTrainer/compare/v2.0.0...v2.0.1) (2026-09-07)


### Bug Fixes

* **ci:** let release-please use a PAT so CI runs on the release PR ([fe52b9f](https://github.com/Amayyas/ChessTrainer/commit/fe52b9fd247f748b585f42c74adbbc3c08c41a12))
* **ci:** stop Prettier checking the release-please CHANGELOG ([a0080f3](https://github.com/Amayyas/ChessTrainer/commit/a0080f3930dda26089c29e575ddc86f0cb69704e))
* **ci:** unblock the release-please PR ([19818b4](https://github.com/Amayyas/ChessTrainer/commit/19818b43e5bd6c664ac3bf7fdc1a0d705381fba8))
* **scripts:** address the two CodeQL findings in the new scripts ([5c9f342](https://github.com/Amayyas/ChessTrainer/commit/5c9f3420eb7ad23a1786885626c0034ee74f421f))


### Refactoring

* **scripts:** share the Postgres bring-up, fix rls-db.sh's initdb race ([0d8931e](https://github.com/Amayyas/ChessTrainer/commit/0d8931eacfec2d9fd05aae36d6ed48dbe7ee3bd3))
