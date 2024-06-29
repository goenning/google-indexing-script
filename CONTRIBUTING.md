# Contributing to Google Indexing Script

Before jumping into a PR be sure to search [existing PRs](/goenning/google-indexing-script/pulls) or [issues](/goenning/google-indexing-script/issues) for an open or closed item that relates to your submission.

# Developing

All pull requests should be opened against `main`.

1. Clone the repository
```bash
git clone https://github.com/goenning/google-indexing-script.git
```

2. Install dependencies
```bash
npm install
```

3. Install the cli globally
```bash
npm install -g .
```

4. Run the development bundle
```bash
npm run dev
```

5. See how to [use it](/README.md#installation) and make your changes !

# Building

After making your changes, you can build the project with the following command:

```bash
npm run build
```

# Pull Request

1. Make sure your code is formatted with `prettier`
2. Make sure your code passes the tests
3. Make sure you added the changes with `npm run changeset`
