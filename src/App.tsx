import { useEffect } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import LogGame from "./pages/LogGame";
import News from "./pages/News";
import NewPlayer from "./pages/NewPlayer";
import Poll from "./pages/Poll";
import { usePollStatus } from "./lib/usePollStatus";
import { logVisit } from "./lib/visit";

export default function App() {
  const poll = usePollStatus();
  useEffect(() => {
    logVisit();
  }, []);
  return (
    <div className="shell">
      <nav className="nav">
        <NavLink to="/" end>
          Ladder
        </NavLink>
        <NavLink to="/log">Log a game</NavLink>
        <NavLink to="/news">News</NavLink>
        {poll.open && <NavLink to="/poll">Weekly poll</NavLink>}
        <NavLink className="add-new" to="/new-player">
          Add new player
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/log" element={<LogGame />} />
        <Route path="/poll" element={<Poll />} />
        <Route path="/news" element={<News />} />
        <Route path="/new-player" element={<NewPlayer />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <footer className="footer">
        <span>PHI DELT / EVERY GAME HAS A STORY</span>
      </footer>
    </div>
  );
}
