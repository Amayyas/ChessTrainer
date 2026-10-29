# Changelog

## [2.6.0](https://github.com/Amayyas/ChessTrainer/compare/v2.5.0...v2.6.0) (2026-10-29)


### Features

* **auth:** check the chosen username on the sign-up form ([02843f7](https://github.com/Amayyas/ChessTrainer/commit/02843f7a9243e5c2bc2dba799d61545d72204eec))
* **board:** read the boards to a screen reader ([ee7339d](https://github.com/Amayyas/ChessTrainer/commit/ee7339d71e547f0cdd3f5655576c143d81474dbf))
* **board:** read the boards to a screen reader ([f2fd00d](https://github.com/Amayyas/ChessTrainer/commit/f2fd00dff23eed0ab6c02c234afb7137b5a6a9a5))
* **board:** say a position, a move and a hunt in words ([d8bcf77](https://github.com/Amayyas/ChessTrainer/commit/d8bcf775a96214ffeb3c8712d7ad4322bfb74b76))
* **csp:** let the site load players' photos from Supabase Storage ([306371f](https://github.com/Amayyas/ChessTrainer/commit/306371fe9138120a419a4a988d19191f5f60a70d))
* **db:** accept accented usernames and say whether one is free ([ca35a85](https://github.com/Amayyas/ChessTrainer/commit/ca35a851d8fb00b1dc052a7b1b7936ae1b5394b9))
* **db:** store a checked profile photo and take it down on reports ([db68863](https://github.com/Amayyas/ChessTrainer/commit/db6886324687463097014a897d6eae45fe48aa33))
* **functions:** check a profile photo before it is stored ([f8f88ce](https://github.com/Amayyas/ChessTrainer/commit/f8f88cef00740f1ab1c200b78c1cf4d346208ca8))
* **hunt:** read the Piece Hunt's board to a screen reader ([669c8ca](https://github.com/Amayyas/ChessTrainer/commit/669c8ca7e841b6486ffa60605c79aee57834c2ad))
* **leaderboard:** show players' photos and let them be reported ([d004b59](https://github.com/Amayyas/ChessTrainer/commit/d004b5956004daf8cca2102773a6ac183a9401b3))
* **legal:** describe the profile photo in the privacy policy ([5be973e](https://github.com/Amayyas/ChessTrainer/commit/5be973e34a2164b5036f31bbd04bff4fa71303f5))
* profile photos, checked before publication and taken down on reports ([0632b3a](https://github.com/Amayyas/ChessTrainer/commit/0632b3ad3e4d42bea435194e0e162f850a4a4f40))
* **profile:** let a player change their username ([431ea2c](https://github.com/Amayyas/ChessTrainer/commit/431ea2c36dc5db83f13e4ff39b0e42aa38f5e11d))
* **profile:** let a player use a photo from their device as avatar ([6685112](https://github.com/Amayyas/ChessTrainer/commit/66851123f45ce43629f31a32d09ad714f23a01b9))
* **seo:** publish llms.txt, built from the pages the sitemap lists ([6de64d0](https://github.com/Amayyas/ChessTrainer/commit/6de64d068d6a06f93a16526f309fcf30cabafb6b))


### Bug Fixes

* **auth:** ignore a username answer about a name since changed ([f86388a](https://github.com/Amayyas/ChessTrainer/commit/f86388ac9a32ec22de5e2481fb5c95157a179921))
* **ci:** drop the braces exception now its advisory is withdrawn ([cc740bc](https://github.com/Amayyas/ChessTrainer/commit/cc740bcf50c3c88ee6e4ac03a64103e784ee0fdb))
* **db:** keep clients off profiles.photo_path despite default grants ([dab091a](https://github.com/Amayyas/ChessTrainer/commit/dab091af28f57bce4a342d7f2dcdaf4e98924a93))
* **db:** rename usernames the new rule refuses before enforcing it ([144f818](https://github.com/Amayyas/ChessTrainer/commit/144f8188994086c6997ec33b077efdb2236c5337))
* **db:** restore a wrongly reported photo in one step, and requeue it ([6981a7f](https://github.com/Amayyas/ChessTrainer/commit/6981a7f951ad82e41b0397b39ad8937c6ce8681c))
* **db:** run the policy tests under Supabase's default grants ([4b5bb41](https://github.com/Amayyas/ChessTrainer/commit/4b5bb41b4158c1cbc3af8aec4119c84796db8563))
* **deps:** clear the audit gate's three blocking findings ([45b2c0f](https://github.com/Amayyas/ChessTrainer/commit/45b2c0f2ba55bfde4e4b573b54e029f6016615e4))
* **deps:** lift Lighthouse CI's puppeteer-core past the zod advisory ([0301f6b](https://github.com/Amayyas/ChessTrainer/commit/0301f6bfd295035c028f191c4f0fec666f59158c))
* **deps:** take body-parser 1.20.9 under Lighthouse CI ([a9dfc3c](https://github.com/Amayyas/ChessTrainer/commit/a9dfc3ca68962f805745dd7ff8cc78c94fd2b100))
* **hunt:** never refill the board under the champion ([8dbe26d](https://github.com/Amayyas/ChessTrainer/commit/8dbe26d5982086e71c474f57a8e581798eaba738))
* **hunt:** never refill the board under the champion ([4f9f964](https://github.com/Amayyas/ChessTrainer/commit/4f9f964e9b6b6c98d749ee34719e26ded4a48392))
* **netlify:** answer /.well-known/ with a 404, not the app ([495d226](https://github.com/Amayyas/ChessTrainer/commit/495d22697d6231806907bf4ae4f394a250dd08a3))
* **photo:** delete the files before the pointer, and cap the body as it is read ([00bbc84](https://github.com/Amayyas/ChessTrainer/commit/00bbc84f01c23315c5e77d62299a7644c3238b8c))
* **profile:** clear a failed rename's message when a retry succeeds ([2e23f19](https://github.com/Amayyas/ChessTrainer/commit/2e23f190b0195074f24fefceb9a915751207d869))
* **profile:** write a checked photo onto the current profile, not a stale copy ([94fc5f2](https://github.com/Amayyas/ChessTrainer/commit/94fc5f2f17700da611d2533ea25641bd92ea544d))
* **seo:** escape a backslash in llms.txt link text ([2dd9d51](https://github.com/Amayyas/ChessTrainer/commit/2dd9d518feafbbff23ff26a1c3e446a3f1a9f144))
* **seo:** publish llms.txt, and answer /.well-known/ with a 404 ([b913376](https://github.com/Amayyas/ChessTrainer/commit/b9133765a1d355b25929c915fe8b2c83dce203a6))

## [2.5.0](https://github.com/Amayyas/ChessTrainer/compare/v2.4.0...v2.5.0) (2026-10-22)


### Features

* **auth:** set the account screens in the newsprint style ([629fc95](https://github.com/Amayyas/ChessTrainer/commit/629fc959177ad6e89aa1f1f85e375259c307ea28))
* **battle:** set the battle as a column beside the board ([6ceecf0](https://github.com/Amayyas/ChessTrainer/commit/6ceecf02924b2074951bdbdf7ca401622c28f717))
* **board:** draw every board with chessground, as a printed diagram ([8259853](https://github.com/Amayyas/ChessTrainer/commit/825985355dff4ad7399fff8ebfada40301cffd36))
* **board:** draw the game boards with chessground, as a printed diagram ([e7ac562](https://github.com/Amayyas/ChessTrainer/commit/e7ac562d4f367835adf05b1826f89c559a6bdfe4))
* **board:** let the player turn the squares plain ([8e73c10](https://github.com/Amayyas/ChessTrainer/commit/8e73c10f8f17d21c3044f6043049ae1fea86a8b6))
* **board:** play the boards from the keyboard ([dcd1c84](https://github.com/Amayyas/ChessTrainer/commit/dcd1c84b689310eeba453d888f4022dd0acc68c1))
* **board:** read a move typed in French notation, or square to square ([7bb9a70](https://github.com/Amayyas/ChessTrainer/commit/7bb9a7057ba92332e6b2bb31c7c314844b3e8187))
* **brand:** draw the favicon and the social image in ink on paper ([b12f4a0](https://github.com/Amayyas/ChessTrainer/commit/b12f4a0143f4f6229057bd644c9d53d2eba10380))
* **coach:** mark the best move with a star, and faults in the rubric ([4ca97fc](https://github.com/Amayyas/ChessTrainer/commit/4ca97fce073f9886d21ecedaadcbdc648cfd147c))
* **coach:** set the coach as a column beside its diagram ([3c2e246](https://github.com/Amayyas/ChessTrainer/commit/3c2e24600d9b1a102511668364b5ae79d7fdeebe))
* **design:** add the newsprint palette, type scale and durations ([3550730](https://github.com/Amayyas/ChessTrainer/commit/35507306af9c4e67aa676c5b887a4b17953fc4a7))
* **design:** set the interface in Newsreader ([48502a6](https://github.com/Amayyas/ChessTrainer/commit/48502a69c3a33112a526ffe7f481078ee9a726b1))
* **fonts:** bring the italic back for captions ([74ad002](https://github.com/Amayyas/ChessTrainer/commit/74ad0026fa0ef1deb1db05d5a8ae78d85794fb53))
* **fonts:** self-host the chess figurines and grade signs ([45ce0f9](https://github.com/Amayyas/ChessTrainer/commit/45ce0f950cc648f2a97e3405eb400b6e39ec8089))
* **home:** set the dashboard as a results page ([9b3c670](https://github.com/Amayyas/ChessTrainer/commit/9b3c67045dcafe0b7d3009ceb5f6734132400366))
* **home:** set the landing as a front page ([206a1be](https://github.com/Amayyas/ChessTrainer/commit/206a1be9c36fcf5eb419e5f7b068f887f94638fa))
* **hunt:** set the piece hunt as a column beside the board ([3b38a9f](https://github.com/Amayyas/ChessTrainer/commit/3b38a9f32fff53e3cb9c533cb5efa6bf7adb2021))
* **hunt:** set the Piece Hunt on chessground, as the other boards ([3242ed8](https://github.com/Amayyas/ChessTrainer/commit/3242ed85f4d65bf1e631d617ac0df042692592a3))
* **i18n:** write numbers the French way ([3ef8a54](https://github.com/Amayyas/ChessTrainer/commit/3ef8a5493095229d2fd4113347f01797f8100258))
* **layout:** set the head of every page as a newspaper's masthead ([cb24951](https://github.com/Amayyas/ChessTrainer/commit/cb249518fd01424e6e9975510dc8893723ce6bd3))
* **leaderboard:** set the leaderboard as a results table ([d7da6ce](https://github.com/Amayyas/ChessTrainer/commit/d7da6ceb60d87b9a16318a91189e1d248482ba23))
* **notation:** write moves in figurines ([0adc6a7](https://github.com/Amayyas/ChessTrainer/commit/0adc6a768644bd4160986ae51b624903b0cf72fa))
* **pages:** set the legal pages, the not-found page and the error screens ([c41789f](https://github.com/Amayyas/ChessTrainer/commit/c41789f7254f2f82abc509ddec3c8ff88f01487a))
* **profile:** set the profile as two ruled columns ([cc6fdb3](https://github.com/Amayyas/ChessTrainer/commit/cc6fdb3dfd8a7176970e91ba470de417fcd24db0))
* **puzzle:** set the puzzles as a column beside the board ([0ee59d2](https://github.com/Amayyas/ChessTrainer/commit/0ee59d225544912df3315230e1a947812b62236f))


### Bug Fixes

* **a11y:** draw the focus ring in the rubric ([b2abb62](https://github.com/Amayyas/ChessTrainer/commit/b2abb626c2f08ed03a1744c0843d0270ff8bb5a9))
* **battle:** say in the status line when the engine stops answering ([43aa639](https://github.com/Amayyas/ChessTrainer/commit/43aa6397a1003b1141e8c286a848a4210b535dcd))
* **board:** close the promotion choice when the board stops taking moves ([8bb1eb1](https://github.com/Amayyas/ChessTrainer/commit/8bb1eb18b588725adb3cc583daad4f265120fd26))
* **board:** compare the last move and the arrows by value ([afbd237](https://github.com/Amayyas/ChessTrainer/commit/afbd2377dbc81bb367880662abbf89cc909c5644))
* **board:** give a move the board does not play back its whole state ([b7e765d](https://github.com/Amayyas/ChessTrainer/commit/b7e765daf2275144afbf2cb90e68e1220b270bd5))
* **board:** keep a square's marks under the ones a selection adds ([c556dd3](https://github.com/Amayyas/ChessTrainer/commit/c556dd33b96388cd9c72a007886a1d081d72ca4f))
* **coach:** centre the evaluation gauge's bar over its figures ([5cd0ac8](https://github.com/Amayyas/ChessTrainer/commit/5cd0ac834121778024ee95e6fae839a118a2234d))
* **coach:** keep a grade sign's own size whatever size it is given ([0b295e4](https://github.com/Amayyas/ChessTrainer/commit/0b295e4bb3dcbe636addf4b435bb983e83f79582))
* **coach:** keep the key's star and ticks a size smaller than its marks ([0aa1a79](https://github.com/Amayyas/ChessTrainer/commit/0aa1a79c672f488affd30aa6160d1e5e046d5d3b))
* **coach:** say a check in the coach's live state line ([7eff6ae](https://github.com/Amayyas/ChessTrainer/commit/7eff6ae04c6dab91f197da882383e726ed05d98f))
* **design:** set the text that names no size on the type scale ([148265c](https://github.com/Amayyas/ChessTrainer/commit/148265c394141082a4aa4c8a166e7e5ef50cd576))
* **hunt:** hand the board a new position only when it changes ([17743cf](https://github.com/Amayyas/ChessTrainer/commit/17743cf14fa151f4bb3675f2ea8a92ef64b37936))
* **hunt:** stop the hunt board's glide when the reader asks for less motion ([f7dfcc0](https://github.com/Amayyas/ChessTrainer/commit/f7dfcc0a274e80f524925b11eb21035c770d3395))
* **i18n:** round an evaluation's size before giving it its sign ([85ce770](https://github.com/Amayyas/ChessTrainer/commit/85ce7705e975ecb68f0cc26c01cb9f9c077f18fd))
* **layout:** keep the footer out of sight while a page loads ([cea0b91](https://github.com/Amayyas/ChessTrainer/commit/cea0b91637ae6701486a1b9937414c8d50a34713))
* **notation:** draw figurines as their face cuts them, in bold or italic text ([6b95915](https://github.com/Amayyas/ChessTrainer/commit/6b959154785d11de623c1d9e5bbf60e0f907faad))
* **profile:** write a falling accuracy trend with a true minus ([68cad0b](https://github.com/Amayyas/ChessTrainer/commit/68cad0b540ad6b87baebf41e7374f294f9398c74))
* **ui:** keep a link in an alert readable, and set alerts and links in one place ([01c885c](https://github.com/Amayyas/ChessTrainer/commit/01c885c848148a446a52e75101beb2fb4a46f612))
* **ui:** merge classes with the tailwind-merge made for Tailwind 3 ([f1c5b2d](https://github.com/Amayyas/ChessTrainer/commit/f1c5b2d71bbb7a13987f6c35e10d7a22fa35e4dd))


### Performance

* **app:** drop framer-motion and the route transitions ([708987f](https://github.com/Amayyas/ChessTrainer/commit/708987f6042b602549878ba3cc7bc976e7a72879))
* **board:** do not hand chessground the config it was just made with ([dd5f13b](https://github.com/Amayyas/ChessTrainer/commit/dd5f13b3424408b5cb4358fd73d6dbb3daff4c7c))
* **fonts:** measure the fallbacks at the pages' sizes, with italics and a medium ([c819137](https://github.com/Amayyas/ChessTrainer/commit/c819137d0a5c6c2d1de483df84dc9ab067c5ffbf))
* **fonts:** preload Newsreader and give its fallbacks matching metrics ([7c507d3](https://github.com/Amayyas/ChessTrainer/commit/7c507d39b3dd3109fd3c187975488370b5c437d9))
* **fonts:** set the italic from its static regular, a third of the weight ([d1b53ed](https://github.com/Amayyas/ChessTrainer/commit/d1b53edb70a9b2d491f741ea4f668895cbdd9fc4))
* **home:** fetch the diagram's board once the page has loaded ([d2d9d36](https://github.com/Amayyas/ChessTrainer/commit/d2d9d36dcd823ba58e70e6312bf7a376593fbd5c))


### Refactoring

* **board:** drop react-chessboard and what only it needed ([16dfda7](https://github.com/Amayyas/ChessTrainer/commit/16dfda7534ebbb3b672f46677bc87b13fa2d53d7))
* **board:** keep chessground's lifecycle in one hook ([7c89bb6](https://github.com/Amayyas/ChessTrainer/commit/7c89bb613e229a61e0f44a8132add59ff8af2317))
* **board:** keep one list of examples, and pin the line the player reads ([3401962](https://github.com/Amayyas/ChessTrainer/commit/3401962a9fac1d9ae5e18e676c0a4912fbec8800))
* **board:** lift the keyboard field out of the move input ([472bc15](https://github.com/Amayyas/ChessTrainer/commit/472bc15b1c8e534a3b1ec01a0e2c2f52c7fb16cb))
* **board:** read the pieces off a FEN in one place ([2c9da08](https://github.com/Amayyas/ChessTrainer/commit/2c9da0860588aee9ab09a1ccf18492288ee04ed5))
* **board:** write the field's examples from the letters it reads ([2a5c45a](https://github.com/Amayyas/ChessTrainer/commit/2a5c45af08be48707b06e2e8fe8d923bb77f0ee2))
* **brand:** draw the social image from the site's own words ([a75cad3](https://github.com/Amayyas/ChessTrainer/commit/a75cad3f8921ffd0df196f9c92cecfac55efb9e5))
* **design:** offer the type scale and no other size ([2ff34cb](https://github.com/Amayyas/ChessTrainer/commit/2ff34cbaac05051862772ef6d25cd02c9626725a))
* **design:** remove the shadcn colour bridge ([1257e8d](https://github.com/Amayyas/ChessTrainer/commit/1257e8d730e42b3003595315378c6d0391e532c8))
* **design:** retire the previous palette ([1841cd0](https://github.com/Amayyas/ChessTrainer/commit/1841cd0adc09a8abb21aefadcb317e2b3aca29cc))
* **fonts:** leave the italic out until something is set in it ([6563c5b](https://github.com/Amayyas/ChessTrainer/commit/6563c5b770f28b0762e4197ac54e942dde31ac03))
* **home:** hold the landing's diagram and caption to its sample game ([332fc1d](https://github.com/Amayyas/ChessTrainer/commit/332fc1d8a52e3abe1820063b4c1fef6be777ab9e))
* **hunt:** keep the champion's squares against the champion too ([e23f4c4](https://github.com/Amayyas/ChessTrainer/commit/e23f4c43044098e28fa36202c04fdea2823217c3))
* **landing:** remove the Aurora gradient background ([59468ca](https://github.com/Amayyas/ChessTrainer/commit/59468ca1938d4c2bd29ebaca5d0820b71e956fd6))
* **notation:** drop frenchSan, which nothing calls ([42975d1](https://github.com/Amayyas/ChessTrainer/commit/42975d14b339f8470ef6cfae66e0c03477372963))
* **pages:** name the section ids in English ([1e9a186](https://github.com/Amayyas/ChessTrainer/commit/1e9a186c9b2320e93d539d88e75ae90fde0f51cc))
* **ui:** draw dialogs and sheets without lucide or entrance animations ([696f758](https://github.com/Amayyas/ChessTrainer/commit/696f75836430603e2953d4d6a932dec7c4a40385))
* **ui:** remove the card shadows ([46fd4fc](https://github.com/Amayyas/ChessTrainer/commit/46fd4fc041ae49300b56865ff86ce7f0347097a2))
* **ui:** replace the shadcn badge with a newsprint tag ([1bedb4b](https://github.com/Amayyas/ChessTrainer/commit/1bedb4b5bfd80d23f93bcee2c17fbc81936fb778))
* **ui:** replace the shadcn button with a newsprint one ([a748a57](https://github.com/Amayyas/ChessTrainer/commit/a748a5751cb4aed54364f2fec4c3181fb754ac09))
* **ui:** replace the shadcn card with a ruled box ([3afa9d9](https://github.com/Amayyas/ChessTrainer/commit/3afa9d9861e483cf8e35f4e252f8451acf77e71e))
* **ui:** restyle tabs, toggle groups and the page header ([e14e0d3](https://github.com/Amayyas/ChessTrainer/commit/e14e0d3b4dcffa07b60fac202c38a78eb0a6e1d4))
* **ui:** set a box score's row from its figures unless told otherwise ([34e5c62](https://github.com/Amayyas/ChessTrainer/commit/34e5c62b33893ee50c884fad0c95d097abc7b117))
* **ui:** set every box score with one component ([eff8fb2](https://github.com/Amayyas/ChessTrainer/commit/eff8fb2d4363dc4cebb770e7144a2d62555f19a7))
* **ui:** set the remaining button-shaped links as buttons ([d35843e](https://github.com/Amayyas/ChessTrainer/commit/d35843e18879280d4b11d1944bd55e0a5de24261))
* **ui:** set the rubric block in one place ([b3dd0e7](https://github.com/Amayyas/ChessTrainer/commit/b3dd0e75fd74729f6fcf8e3c1a0f1ab27cc32d41))

## [2.4.0](https://github.com/Amayyas/ChessTrainer/compare/v2.3.2...v2.4.0) (2026-10-07)


### Features

* **security:** enforce the Content-Security-Policy ([3dab731](https://github.com/Amayyas/ChessTrainer/commit/3dab73183418afb97af99edfa30915ece9435301))
* **security:** enforce the Content-Security-Policy ([f695566](https://github.com/Amayyas/ChessTrainer/commit/f695566e2f6ee34735e87e50ba7d9135c2ef852f))


### Bug Fixes

* **ci:** key audit advisories by package as well as id ([66e4de2](https://github.com/Amayyas/ChessTrainer/commit/66e4de2861f5b5a532eb773c10ad95c798fe9145))
* **ci:** reject impossible exception dates and stale non-blocking matches ([0a0d915](https://github.com/Amayyas/ChessTrainer/commit/0a0d915ade3db1f7680539d1eac4b8c4cf4152b2))
* **e2e:** drop stale encoding headers from the rewritten worker script ([b31ad92](https://github.com/Amayyas/ChessTrainer/commit/b31ad9259eb5f6784716bbdfc0edcaa449be4233))
* **e2e:** stop dropping headers after a commented table line ([38e86fe](https://github.com/Amayyas/ChessTrainer/commit/38e86fe65c2b22b69b415fa0a7c9d8b4e442419e))
* **monitoring:** stop sending Sentry a session on every page load ([3640f2f](https://github.com/Amayyas/ChessTrainer/commit/3640f2f2d3d4ff4e8c97f0f87221122f5cdf71a1))
* **monitoring:** stop sending Sentry a session on every page load ([a839cee](https://github.com/Amayyas/ChessTrainer/commit/a839cee37bc968cd42f40a15a1624c2fd83c7236))


### Refactoring

* **e2e:** build the CSP listener without interpolating into code ([f497900](https://github.com/Amayyas/ChessTrainer/commit/f4979001efd47bb88a5094fe86f38f0da1a595b0))

## [2.3.2](https://github.com/Amayyas/ChessTrainer/compare/v2.3.1...v2.3.2) (2026-10-01)


### Bug Fixes

* **seo:** give each indexable route a head of its own before any JS runs ([5c0a686](https://github.com/Amayyas/ChessTrainer/commit/5c0a686303c632908279b13346ef5e4ed89c56d7))
* **seo:** give each indexable route a head of its own before any JS runs ([1e6b903](https://github.com/Amayyas/ChessTrainer/commit/1e6b903c7b893f9c83be34ed90268db895adf278))

## [2.3.1](https://github.com/Amayyas/ChessTrainer/compare/v2.3.0...v2.3.1) (2026-09-25)


### Bug Fixes

* make the deploy verification able to fail, and fix what it caught ([ef9841e](https://github.com/Amayyas/ChessTrainer/commit/ef9841e637d6355a2bdf19cdfbf50ba91931610f))
* **netlify:** stop the catch-all from overwriting the asset cache ([b696e17](https://github.com/Amayyas/ChessTrainer/commit/b696e1744f0d57958587f4ad89de1a6a4d275234))
* **scripts:** close #root by its own tag, and watch the engine's cache ([6f69db5](https://github.com/Amayyas/ChessTrainer/commit/6f69db52bdbb5a10ef4b473203ad9cd446b4e50d))
* **scripts:** tell the shell from the landing by #root, not the title ([0004bfe](https://github.com/Amayyas/ChessTrainer/commit/0004bfeec5c92e8058c157388e19190c4127cde1))

## [2.3.0](https://github.com/Amayyas/ChessTrainer/compare/v2.2.0...v2.3.0) (2026-09-15)


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
