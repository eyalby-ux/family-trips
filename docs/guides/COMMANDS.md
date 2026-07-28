# Command Reference

Run commands from the project root where `package.json` is located.

## Versions

```bash
node --version
npm --version
git --version
```

## Quality gate

```bash
npm run check
```

## Local server

```bash
npm run dev
```

## Stop the server

```text
Ctrl + C
```

## First GitHub push

```bash
git init
git add .
git commit -m "Family Trips Alpha 0.1"
git branch -M main
git remote add origin https://github.com/USERNAME/family-trips.git
git push -u origin main
```

## Later changes

```bash
npm run check
git add .
git commit -m "Describe the change"
git push
```

## Inspect or change the remote

```bash
git remote -v
git remote set-url origin https://github.com/USERNAME/family-trips.git
```
