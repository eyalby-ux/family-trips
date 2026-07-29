# Windows Installation

1. Extract the ZIP to `C:\Projects\FamilyTrips\family-trips-alpha-0.2`.
2. Open that folder in VS Code.
3. Open Terminal.
4. Run `node --version`, `npm --version`, and `git --version`.
5. Run `npm run check`.
6. Run `npm run dev`.
7. Open `http://localhost:4173`.
8. Copy the release files into the Git repository root while excluding `.git` and `node_modules`.
9. Run `npm run check`, `git add -A`, `git commit -m "Release Family Trips Alpha 0.2"`, and `git push origin main`.
10. In Netlify use an empty Build command and Publish directory `.`.
