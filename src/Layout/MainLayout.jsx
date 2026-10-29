import NavigationBar from "../Components/NavigationBar";

const MainLayout = ({ children }) => {
  return (
    <>
      <NavigationBar />
      <div className="main-content">
        {children}
      </div>
    </>
  );
};

export default MainLayout;
