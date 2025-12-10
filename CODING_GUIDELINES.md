# 📜 SocialSync Pro - Coding Guidelines & Rules

This document outlines the coding standards, patterns, and best practices to be followed when working on the SocialSync Pro codebase. Adhering to these rules will ensure the code remains clean, maintainable, scalable, and non-redundant.

## 🏛️ 1. Golden Rule: Respect the Project Structure

The single most important rule is to follow the established project structure. Before adding any new file, consult `PROJECT_STRUCTURE.md`.

- **Core Logic**: All core Python processing logic belongs in `src/`.
- **Frontend**: All frontend React/Next.js code belongs in `web-interface/`.
- **Tests**: Every new feature should have corresponding tests in the `tests/` directory.
- **Documentation**: New features or significant changes must be documented in the `docs/` directory.
- **No Clutter**: Never add files to the root directory unless they are for top-level configuration (e.g., `.gitignore`, `README.md`).

---

## 🐍 2. Python (Backend) Rules

We use **Black** for formatting and **Flake8** for linting. All Python code *must* adhere to these standards before being committed.

### **Code Style & Formatting**
- **PEP 8**: All code must follow the PEP 8 style guide.
- **Black Formatter**: Code must be formatted with Black using its default settings. This is not optional and ensures uniform style.
- **Line Length**: Maximum line length is 88 characters, as enforced by Black.
- **Docstrings**: Use Google-style docstrings for all modules, classes, and functions.
  ```python
  def my_function(arg1: str, arg2: bool) -> str:
      """This is a short summary of the function.
  
      This is a more detailed description that can span multiple lines.
  
      Args:
          arg1 (str): Description of the first argument.
          arg2 (bool): Description of the second argument.
  
      Returns:
          str: Description of the return value.
      """
      # ... function body ...
      return "Hello"
  ```
- **Type Hinting**: All function signatures and variable declarations must include type hints.

### **Best Practices**
- **DRY (Don't Repeat Yourself)**: If you find yourself writing the same code in multiple places, refactor it into a reusable function or class in `src/core/` or `src/scripts/`.
- **SRP (Single Responsibility Principle)**: Each function and class should do one thing and do it well. Avoid monolithic functions that handle too many different tasks.
- **Configuration**: Do not hardcode values. Use the `web-interface/src/constants/` for frontend settings or pass them as arguments from the UI for backend scripts.
- **Error Handling**: Use specific exceptions. Avoid broad `except Exception:` clauses. Log errors clearly with context.

---

## ⚛️ 3. TypeScript/React (Frontend) Rules

We use **Prettier** for formatting and **ESLint** for linting.

### **Code Style & Formatting**
- **Prettier**: All `.ts` and `.tsx` files must be formatted with the project's Prettier configuration.
- **Naming**:
    - Components: `PascalCase` (e.g., `VideoPreview.tsx`)
    - Hooks: `useCamelCase` (e.g., `useVideoDiscovery.ts`)
    - Variables & Functions: `camelCase`
- **Component Structure**: Keep components small and focused. If a component grows too large, break it down into smaller, reusable sub-components.

### **Best Practices**
- **State Management**:
    - Use React hooks (`useState`, `useEffect`, `useContext`) for local and shared state.
    - Lift state up only as far as necessary.
    - For complex global state, consider using a state management library if needed, but prefer React Context for simplicity.
- **DRY**: Create reusable components in `web-interface/src/components/` and reusable hooks in `web-interface/src/hooks/`.
- **Props**: Use TypeScript interfaces to define props for every component.
- **API Calls**: All API interactions should be handled within the `web-interface/src/app/api/` routes or through custom hooks that fetch data.

---

## ⚙️ 4. General Development Rules

### **Version Control (Git)**
- **Branching**: All new work should be done on a feature branch (e.g., `feature/add-new-subtitle-style`).
- **Commit Messages**: Write clear, concise commit messages. Start with a verb and a short description (e.g., "Feat: Add channel selection dropdown to main page").
- **Pull Requests**: Before merging, ensure all tests pass and the code has been formatted and linted.

### **Redundancy**
- **Code**: Before writing any new function, check `src/core` and `src/scripts` to see if a utility that does what you need already exists.
- **UI**: Before creating a new component, check `web-interface/src/components` for a similar one that could be adapted or reused.

### **Adding New Features**
Any new feature must include:
1.  **Working Code**: The feature must be fully functional.
2.  **Tests**: New unit or integration tests must be added to the `tests/` directory.
3.  **Documentation**: A brief markdown file explaining the feature should be added to `docs/`.
4.  **No Regressions**: The new feature must not break any existing functionality. 