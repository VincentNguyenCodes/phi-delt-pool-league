import { NavLink, Route, Routes } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";

export default function App() {
  return (
    <div className="shell">
      <nav className="nav">
        <NavLink to="/" end>
          Ladder
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
      </Routes>
      <footer className="footer">
        <span>PHI DELT / EVERY GAME HAS A STORY</span>
      </footer>
    </div>
  );
}
