import { createRoot } from "react-dom/client";
import AppWrapper from "./AppWrapper.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";
createRoot(document.getElementById("root")!).render(
	<ErrorBoundary>
		<AppWrapper /> 
	</ErrorBoundary>
);
