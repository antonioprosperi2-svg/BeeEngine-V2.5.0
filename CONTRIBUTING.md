# Contributing to BeeEngine

Thank you for wanting to help! Every contribution is welcome: bug reports, ideas, docs fixes, examples and code. You do not need to be an expert. If you are new to open source, you are in the right place.

## The one rule

BeeEngine is **vanilla JavaScript with zero runtime dependencies** and no build step. Please do not add any package to `dependencies`, and do not import third-party libraries in `src/`. If you think a feature needs one, open an issue first and we will find another way together.

Plugins (for example BeeInventory or BeeDialogue) live in `src/plugins/` and should not import each other. Keep each plugin independent.

## Report a bug or share an idea

1. Search the [issues](https://github.com/antonioprosperi2-svg/BeeEngine-V2.5.0/issues) to see if it is already there.
2. If not, open a new issue.
3. For a bug, tell us what you did, what you expected and what happened. Your browser or device and the BeeEngine version help a lot.
4. For an idea, say what it is for. A short example helps.

## Send a pull request

1. Fork the repository and clone your fork.
2. Create a branch from `main` with a short name, for example `fix-bullet-bounds`.
3. Make your change. Keep it small and focused: one idea per pull request, and match the style of the file you are editing.
4. Run the checks and make sure they pass (you need Node.js 18 or newer):

   ```
   npm install
   npm run typecheck
   node scripts/test-<name>.mjs
   ```

   (`npm install` only adds the development tools for type checks. The engine itself has no dependencies.)
5. Add or update a test in `scripts/` when you change behavior, and add a short line to `CHANGELOG.md`.
6. Open a pull request with a clear description: what changed and why, and how you tested it.

If you are new to pull requests, GitHub's guide [Hello World](https://docs.github.com/en/get-started/quickstart/hello-world) walks through a fork, a branch, and a pull request.

## Not sure where to start?

Open an issue and say hello. Small questions are welcome, and nobody will judge a first contribution.

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
