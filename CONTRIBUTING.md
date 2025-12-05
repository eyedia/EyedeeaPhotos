# Contributing to Eyedeea Photos

Thank you for your interest in contributing to Eyedeea Photos! This document outlines guidelines, license information, and best practices for contributing.

## Table of Contents

1. [Licensing Information](#licensing-information)
2. [Code of Conduct](#code-of-conduct)
3. [How to Contribute](#how-to-contribute)
4. [Development Setup](#development-setup)
5. [Commit Guidelines](#commit-guidelines)
6. [Pull Request Process](#pull-request-process)
7. [Reporting Issues](#reporting-issues)

---

## Licensing Information

### Important: Dual License Model

Eyedeea Photos uses a **dual licensing model**:

#### 1. **Open Source Core (GNU General Public License v3.0)**
- **All code in this repository** is licensed under GPL v3.0
- Includes: Server (Node.js), Web UI, Mobile Apps (FireTV/Android)
- **Anyone can:**
  - Use the software freely
  - Modify the source code
  - Distribute copies
  - Create derivative works
- **Requirements (copyleft):**
  - Any modifications must remain open source
  - License text must be included
  - Distribute source code with modifications

For details, see: [LICENSE](LICENSE)

### SPDX License Headers

All source files in this repository should include SPDX license identifiers:

```javascript
/**
 * Eyedeea Photos - Photo Curation Application
 * 
 * This file is part of Eyedeea Photos.
 * Eyedeea Photos is licensed under the GNU General Public License v3.0
 * 
 * For premium/commercial features, see: LICENSE.COMMERCIAL
 * 
 * SPDX-License-Identifier: GPL-3.0-only
 */
```

### Contributing to Open Source

When you contribute to this repository:

1. **Your contributions are licensed under GPL v3.0**
   - Ensure you have the right to license your code as GPL v3.0
   - Work must be your own or properly licensed

2. **Copyleft obligation applies**
   - If you modify GPL code, your modifications must also be GPL v3.0
   - This protects the open source nature of the project

3. **You retain attribution**
   - We maintain a CONTRIBUTORS file
   - Your name will be credited in releases
   - You can request removal if desired

---

## Code of Conduct

### Be Respectful

- Treat all contributors and users with respect
- Value diverse perspectives and backgrounds
- No harassment, discrimination, or hateful language
- Create an inclusive and welcoming environment

### Be Professional

- Provide constructive feedback
- Accept criticism gracefully
- Help others learn and grow
- Resolve conflicts privately when possible

### Be Ethical

- Use the software only for legitimate purposes
- Respect privacy and data protection laws
- Don't attempt to circumvent licenses or restrictions
- Report security vulnerabilities responsibly

---

## How to Contribute

### Types of Contributions

1. **Code Contributions**
   - Bug fixes
   - Feature enhancements
   - Performance improvements
   - Code refactoring

2. **Documentation**
   - README improvements
   - API documentation
   - User guides
   - Code comments

3. **Testing**
   - Bug reports with reproduction steps
   - Test cases
   - Edge case identification

4. **Translations**
   - UI translation
   - Documentation translation

5. **Community Support**
   - Help other users
   - Answer questions
   - Review pull requests

### What We're Looking For

- **Quality**: Code should be well-tested and documented
- **Compatibility**: Works with Node.js 18+, tested on major platforms
- **Security**: No security vulnerabilities or unsafe practices
- **Maintainability**: Code is readable and easy to maintain
- **Performance**: Efficient solutions without unnecessary overhead

### What We Won't Accept

- Code that violates the GPL v3.0 license
- Proprietary code that can't be GPL'd
- Code with security vulnerabilities
- Features that conflict with the app's purpose
- Contributions from users banned for Code of Conduct violations

---

## Development Setup

### Prerequisites

- Node.js 18.0 or higher
- npm 8.0 or higher
- Git
- SQLite3 (usually included with Node.js)

### Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/EyedeeaPhotos.git
cd EyedeeaPhotos

# Add upstream remote
git remote add upstream https://github.com/eyedia/EyedeeaPhotos.git
```

### Install Dependencies

```bash
npm install
```

### Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
# For local development, defaults should work
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test tests/api/api.int.test.js
```

### Start Development Server

```bash
# Start the app
npm start

# Or with hot-reload (if using nodemon)
npm run dev
```

### Access Development App

- Management UI: http://localhost:8080/manage
- Player: http://localhost:8080/

---

## Commit Guidelines

### Commit Message Format

Use clear, descriptive commit messages:

```
<type>: <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Code style (formatting, missing semicolons, etc.)
- **refactor**: Code restructuring without feature changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build, dependencies, tooling

### Examples

```bash
git commit -m "feat: add face recognition to premium features"
git commit -m "fix: resolve issue with source deletion not refreshing list"
git commit -m "docs: update installation guide for Windows"
git commit -m "refactor: simplify version comparison logic"
```

### Best Practices

- Keep commits focused on a single change
- Write commits in present tense ("add" not "added")
- Reference issues when relevant: `fix #123`
- Don't mix multiple concerns in one commit
- Ensure tests pass before committing

---

## Pull Request Process

### Before Starting

1. Check existing issues and pull requests to avoid duplicates
2. Create an issue first for major changes
3. Fork the repository
4. Create a feature branch: `git checkout -b feature/your-feature-name`

### Development

1. Make your changes
2. Add or update tests
3. Update documentation if needed
4. Run tests: `npm test`
5. Check code quality: `npm run lint` (if available)

### Before Submitting

1. Update your branch with latest from main:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. Commit with clear messages

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

### Create Pull Request

1. Go to GitHub and create Pull Request
2. Title: Clear, descriptive title
3. Description: Include:
   - What changes are made
   - Why the changes are needed
   - How to test the changes
   - Reference related issues: `Fixes #123`

4. Link related issues

### Pull Request Review

- Maintainers will review within 3-7 days
- Be responsive to feedback
- Make requested changes
- Push updates to the same branch
- Be patient and respectful

### Merge

- Maintainer will merge when approved
- Your contribution is complete!
- You'll be added to CONTRIBUTORS list

---

## Reporting Issues

### Security Vulnerabilities

**Do NOT create a public issue for security vulnerabilities!**

Email: security@eyedia.com with:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

### Bugs

Create an issue with:

1. **Title**: Clear description of the bug
2. **Description**: 
   - What happened
   - What should have happened
   - Steps to reproduce (important!)
   - Screenshots/logs if applicable

3. **Environment**:
   - OS (Windows/Linux/Mac)
   - Node.js version
   - npm version
   - Browser (if applicable)

4. **Label**: Add `bug` label

### Feature Requests

Create an issue with:

1. **Title**: Clear description of the feature
2. **Description**: 
   - What is the feature
   - Why is it needed
   - How it should work
   - Possible alternatives

3. **Label**: Add `enhancement` or `feature` label

### Questions/Support

- **GitHub Discussions**: For questions and general discussions
- **GitHub Issues**: For confirmed bugs only
- **GitHub Wiki**: For user guides and documentation

---

## Recognition

Contributors are recognized in multiple ways:

1. **CONTRIBUTORS.md file** - Listed by contribution
2. **Release notes** - Mentioned in changelog
3. **GitHub** - Shows on your profile
4. **Website** - Featured contributors section (optional)

### Opt-Out

If you prefer not to be listed, mention in your PR.

---

## Questions?

- **Licensing**: licensing@eyedia.com
- **Security**: security@eyedia.com
- **General**: GitHub Issues or Discussions
- **Website**: https://eyedeeaphotos.eyediatech.com/

Thank you for contributing to Eyedeea Photos! 🎉

---

Last Updated: December 2024
