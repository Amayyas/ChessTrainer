# Changelog

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
