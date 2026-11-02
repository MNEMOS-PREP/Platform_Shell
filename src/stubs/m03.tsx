/**
 * M03 (GitHub Analyzer) until its UI is in its repo.
 *
 * `vite.config.ts` and `tsconfig.json` fall back to this when
 * `GitHub_Analyzer/Frontend/frontend_M03_GitHub_Analyzer` is not checked out, so
 * a clone without it still starts, and "GitHub projects" says it is on its way
 * instead of taking the whole shell down on an unresolved import.
 */
import { Route } from "react-router-dom";

import { NotBuilt } from "../pages/NotBuilt";

export const m03Routes = (
  <Route
    path="/github/*"
    element={
      <NotBuilt
        name="GitHub projects"
        blurb="This is where the projects on your resume are read from your GitHub."
      />
    }
  />
);
