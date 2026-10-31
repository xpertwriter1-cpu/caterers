import type { PageData } from "../lib/types";
import Home from "./Home";
import Services from "./Services";
import About from "./About";
import Contact from "./Contact";
import Auth from "./Auth";
import Book from "./Book";
import Order from "./Order";
import Request from "./Request";
import Account from "./Account";
import Admin from "./Admin";
import NotFound from "./NotFound";
import ErrorPage from "./Error";

export default function Page(props: PageData) {
  switch (props.view) {
    case "home":
      return <Home {...props} />;
    case "services":
      return <Services {...props} />;
    case "about":
      return <About />;
    case "contact":
      return <Contact />;
    case "auth":
      return <Auth {...props} />;
    case "book":
      return <Book {...props} />;
    case "order":
      return <Order {...props} />;
    case "request":
      return <Request {...props} />;
    case "account":
      return <Account {...props} />;
    case "admin":
      return <Admin {...props} />;
    case "error":
      return <ErrorPage {...props} />;
    default:
      return <NotFound />;
  }
}
