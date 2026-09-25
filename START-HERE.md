# Start from a fresh folder

Frontend Toolkit **1.0.0**. This is a complete project, not a patch. No older ZIP, file move, import-path rewrite, or version increment is required.

Close the old project in VS Code. Extract the archive with Windows File Explorer into an empty location. The archive contains one `frontend-toolkit` folder. Open that folder in VS Code; `package.json`, `index.html`, `src`, and `dist` must be directly inside it. Do not copy files from previous versions.

Node is assumed to be installed already. Open Terminal > New Terminal and choose Command Prompt from the terminal profile menu. Run one command at a time from the folder containing `package.json`:

```sh
npm install
npm run build
npm run verify
npm run preview
```

The first install creates `package-lock.json`. The build performs minification; the supplied distribution is only a readable preview. Inspect the URL printed by the preview server, then press Ctrl+C to stop it.

These commands do not publish or increment the version. Keep LICENSE, NOTICE.txt, and the public third-party notices in licenses/. No separate contributor declaration is required by the preparation scripts.

Continue with [the complete fresh-folder publishing guide](docs/PUBLISHING.md), also available as [a webpage](docs/publishing.html). License and attribution information is in [Licenses and notices](docs/NOTICES.md).

Use this guide instead of the migration/patch instructions from earlier messages.
