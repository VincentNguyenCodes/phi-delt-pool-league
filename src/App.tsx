import { NavLink, Route, Routes } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";
import LogGame from "./pages/LogGame";
import Poll from "./pages/Poll";

export default function App() {
  return (
    <div className="shell">
      <nav className="nav">
        <NavLink to="/" end>
          Ladder
        </NavLink>
        <NavLink to="/log">Log a game</NavLink>
        <NavLink to="/poll">Weekly poll</NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/log" element={<LogGame />} />
        <Route path="/poll" element={<Poll />} />
      </Routes>
      <footer className="footer">
        <span>PHI DELT / EVERY GAME HAS A STORY</span>
      </footer>
    </div>
  );
}
