import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Home } from "@/pages/Home";
import { ProjectPage } from "@/pages/ProjectPage";
import { ContactPage } from "@/pages/ContactPage";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminProjectsPage } from "@/pages/admin/AdminProjectsPage";
import { AdminEditProjectPage } from "@/pages/admin/AdminEditProjectPage";

function Router() {
  return (
    <Switch>
      {/* Public pages */}
      <Route path="/" component={Home} />
      <Route path="/work/:slug" component={ProjectPage} />
      <Route path="/contact" component={ContactPage} />

      {/* Admin pages */}
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/projects" component={AdminProjectsPage} />
      <Route path="/admin/projects/new">
        {() => <Redirect to="/admin/projects" />}
      </Route>
      <Route path="/admin/projects/:id/edit" component={AdminEditProjectPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
