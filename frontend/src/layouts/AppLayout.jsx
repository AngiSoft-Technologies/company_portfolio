import Header from "../components/sections/Header";
import Footer from "../components/sections/Footer";
import { Outlet } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";

const AppLayout = () => {
    const { mode } = useTheme();
    
    return (
        <>
            <Header />
            <main className="content">
                {/*display dynamic content */}
                <Outlet />
            </main>
            <Footer theme={mode} />
        </>
    );
}

export default AppLayout;
