# Full Installation Guide — Family Trips Alpha 0.1

Follow every step in order.

## 1. Install the required tools

Install:

1. VS Code
2. Node.js 18 or later
3. Git
4. Chrome or Edge
5. A GitHub account
6. A Netlify account

After installing Node.js or Git, close and reopen VS Code.

## 2. Save and extract the package

### Windows

Create:

```text
C:\Projects
```

Save the ZIP there and extract it so the final folder is:

```text
C:\Projects\family-trips-alpha-0.1
```

Confirm this file exists:

```text
C:\Projects\family-trips-alpha-0.1\package.json
```

### macOS

Create:

```text
~/Projects
```

Extract the ZIP so the final folder is:

```text
~/Projects/family-trips-alpha-0.1
```

Confirm `package.json` is directly inside that folder.

Do not work inside the ZIP. Extract all files first.

## 3. Open the correct folder in VS Code

1. Open VS Code.
2. Select `File → Open Folder`.
3. Select `family-trips-alpha-0.1`.
4. Confirm the Explorer shows:
   - `index.html`
   - `package.json`
   - `src`
   - `docs`
   - `tests`
   - `netlify.toml`

Do not open only the `src` folder.

## 4. Open the VS Code terminal

Select:

```text
Terminal → New Terminal
```

Confirm the terminal path ends with `family-trips-alpha-0.1`.

### Windows

```powershell
cd C:\Projects\family-trips-alpha-0.1
```

### macOS

```bash
cd ~/Projects/family-trips-alpha-0.1
```

## 5. Verify the tools

Run:

```bash
node --version
npm --version
git --version
```

Node.js must be version 18 or later.

When a command is not recognized, install the missing tool, restart VS Code, and repeat this section.

## 6. Run the quality gate

From the project root run:

```bash
npm run check
```

A successful result ends with:

```text
Smoke tests passed.
```

Do not deploy when this command fails.

## 7. Start the app locally

Run:

```bash
npm run dev
```

On first use, `npx` may ask permission to install `serve`. Type `y` and press Enter.

Open:

```text
http://localhost:4173
```

Keep the terminal open while the app is running.

To stop the server, press:

```text
Ctrl + C
```

When port 4173 is busy, run:

```bash
npx serve . -l 4174
```

Then open:

```text
http://localhost:4174
```

## 8. Perform the first local test

1. Confirm the app opens with no Trip.
2. Upload a PDF or image.
3. Confirm a Trip is created only after intake is accepted.
4. Open Trip Center and confirm the document appears.
5. Select `+`.
6. Create a dated item.
7. Open the item from Today.
8. Open the same item from Timeline.
9. Open the same item from Trip Center.
10. Open Trip Settings.
11. Set start and end dates.
12. Change the range so the item falls outside it.
13. Confirm the item is marked as a conflict.
14. Confirm the item date did not change.
15. Refresh the page.
16. Confirm the data remains.

Use `docs/qa/QA_CHECKLIST.md` for the full test.

## 9. Create an empty GitHub repository

1. Sign in to GitHub.
2. Create a new repository.
3. Recommended name: `family-trips`.
4. Do not add a README, `.gitignore`, or license through GitHub.
5. Create the empty repository.
6. Copy its HTTPS URL.

Example:

```text
https://github.com/USERNAME/family-trips.git
```

## 10. Push the project to GitHub

Run each command separately:

```bash
git init
git add .
git commit -m "Family Trips Alpha 0.1"
git branch -M main
git remote add origin https://github.com/USERNAME/family-trips.git
git push -u origin main
```

Replace the example URL with your repository URL.

When Git asks for identity:

```bash
git config --global user.name "YOUR NAME"
git config --global user.email "YOUR_EMAIL@example.com"
```

Then repeat the commit command.

## 11. Verify GitHub Actions

1. Open the repository in GitHub.
2. Select `Actions`.
3. Open `Quality Gate`.
4. Confirm the workflow is green.

## 12. Deploy with Netlify

1. Sign in to Netlify.
2. Select `Add new site → Import an existing project`.
3. Choose GitHub.
4. Authorize access.
5. Select the `family-trips` repository.
6. Use:
   - Branch: `main`
   - Base directory: empty
   - Build command: empty
   - Publish directory: `.`
7. Select `Deploy`.

The included `netlify.toml` contains the required static-site settings.

## 13. Install the PWA on a phone

### Android with Chrome

1. Open the Netlify URL.
2. Open the browser menu.
3. Select `Install app` or `Add to Home screen`.
4. Confirm.
5. Launch from the new icon.

### iPhone with Safari

1. Open the Netlify URL in Safari.
2. Select Share.
3. Select `Add to Home Screen`.
4. Confirm.
5. Launch from the new icon.

## 14. Test offline behavior

1. Open the deployed app online once.
2. Close it.
3. Enable airplane mode.
4. Reopen the app.
5. Confirm the shell and local data are available.

Uploaded file content is not available because Alpha 0.1 stores metadata only.

## 15. Continue development

After every meaningful change:

```bash
npm run check
git add .
git commit -m "Describe the change"
git push
```

Netlify will deploy the new commit automatically.

## 16. Reset local data

Inside the app:

1. Open Trip Settings.
2. Select Local Reset.
3. Confirm.

This removes data from the current browser profile only.

## Common problems

### `npm` is not recognized

Node.js is missing, or VS Code was not restarted after installation.

### `package.json` cannot be found

The terminal is not in the project root.

### Blank page

- Run the app with `npm run dev`.
- Do not open `index.html` directly.
- Open browser Developer Tools and inspect the Console.

### Old version is displayed

In Chrome Developer Tools:

1. Open `Application`.
2. Open `Service Workers`.
3. Select `Unregister`.
4. Open `Storage`.
5. Select `Clear site data`.
6. Reload.

### GitHub rejects the push

Inspect the remote:

```bash
git remote -v
```

Update it:

```bash
git remote set-url origin https://github.com/USERNAME/family-trips.git
```
