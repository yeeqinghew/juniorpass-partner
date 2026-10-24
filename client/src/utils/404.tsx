import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import "./404.css";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="partner-not-found">
      <h1 className="partner-not-found-code">
        4
        <span>
          <i className="fa fa-frown-o" aria-hidden="true"></i>
        </span>
        4
      </h1>
      <h2 className="partner-not-found-title">
        Error: 404 page not found
      </h2>
      <p>Sorry, the page you're looking for cannot be accessed</p>

      <Button
        onClick={() => navigate(-1)}
      >
        Go back
      </Button>
    </div>
  );
};

export default NotFound;
