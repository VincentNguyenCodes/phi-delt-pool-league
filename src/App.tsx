import { NavLink, Route, Routes } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";
import LogGame from "./pages/LogGame";

export default function App() {
  return (
    <div className="shell">
      <nav className="nav">
        <NavLink to="/" end>
          Ladder
        </NavLink>
        <NavLink to="/log">Log a game</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/log" element={<LogGame />} />
      </Routes>
      <footer className="footer">
        <span>PHI DELT / EVERY GAME HAS A STORY</span>
      </footer>
    </div>
  );
}
