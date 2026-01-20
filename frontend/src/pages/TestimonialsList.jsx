const TestimonialsList = ({ theme }) => {
    // Determine styles based on the theme
    const bgColor = theme === "dark" ? "bg-dark text-light" : "bg-light text-dark";

    return (
        <>
            <section className={`justify-center items-center p-6 min-h-screen ${bgColor}`}>
                <p>This will hold a specific project details</p>
            </section>

            <div className={`flex p-6 ${bgColor}`}>
                <p>We will have other projects being slid here for selection.</p>
            </div>
        </>
    );
};

export default TestimonialsList;