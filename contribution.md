# Contribution Guide

Thanks for helping improve GradBot. This guide explains how to pick work, prepare a branch, make changes, and open a pull request.

## Before You Start

Make sure you have:

- Node.js and npm installed
- The project dependencies installed with `npm install`
- Access to the required environment variables from `README.md`
- A clear issue to work on, or a new issue that describes the work you want to add

## Choose an Issue

You can contribute in one of two ways:

1. **Pick an existing issue**
    - Review open issues
    - Choose one that matches your skills or interest
    - Leave a comment if you want to claim it, if your team uses issue claiming

2. **Create a new issue**
    - Open a new issue for a bug, feature, or improvement
    - Add a clear title and description
    - Include the goal, expected behavior, and any acceptance criteria
    - If possible, add examples, screenshots, or logs

When you choose an issue, make sure you understand the requirement before coding.

## Create a Feature Branch

Work on a new feature branch instead of committing directly to `main`.

Use a branch name that matches the issue or feature:

```bash
git checkout -b feature/issue-123-short-description
```

Good branch names are short, readable, and specific.

## Implement Your Changes

- Keep the changes focused on the selected issue
- Follow the existing code style and project structure
- Add or update tests when needed
- Update documentation if your change affects usage or behavior

If the work depends on extra setup, mention it in the issue or pull request.

## Verify Your Work

Before opening a pull request, run the project checks:

```bash
npm run typecheck
npm run build
npm test
```

Fix any failures before submitting your changes.

## Open a Pull Request

When the branch is ready:

- Push your branch to the remote repository
- Open a pull request into `main`
- Link the related issue in the PR description
- Explain what changed and why
- Include any manual testing steps you used

A good pull request should be small, clear, and easy to review.

## Suggested Workflow

1. Choose or create an issue
2. Create a new feature branch
3. Implement the requested change
4. Run checks and fix problems
5. Push the branch
6. Open a pull request

## Notes

- Do not work directly on `main`
- Keep one branch focused on one issue when possible
- If you need to add a new feature, open an issue first so the work is tracked

Thanks for contributing!
