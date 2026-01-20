import Header from "../components/sections/Header";
import Footer from "../components/sections/Footer";
import { Outlet } from "react-router-dom";

const AppLayout = ({ theme, toggleTheme }) => {
    return (
        <>
            <Header theme={theme} toggleTheme={toggleTheme} />
            <main className="content">
                {/*display dynamic content */}
                <Outlet />
            </main>
            <Footer theme={theme} />
        </>
    );
}

export default AppLayout;
