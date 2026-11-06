import { NavLink, Route, Routes } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";
import LogGame from "./pages/LogGame";
import News from "./pages/News";
import Poll from "./pages/Poll";
import { usePollStatus } from "./lib/usePollStatus";

export default function App() {
  const poll = usePollStatus();
  return (
    <div className="shell">
      <nav className="nav">
        <NavLink to="/" end>
          Ladder
        </NavLink>
        <NavLink to="/log">Log a game</NavLink>
        <NavLink to="/news">News</NavLink>
        {poll.open && <NavLink to="/poll">Weekly poll</NavLink>}
      </nav>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/log" element={<LogGame />} />
        <Route path="/poll" element={<Poll />} />
        <Route path="/news" element={<News />} />
      </Routes>
      <footer className="footer">
        <span>PHI DELT / EVERY GAME HAS A STORY</span>
      </footer>
    </div>
  );
}
