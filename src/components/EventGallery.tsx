import { Fragment } from "react";
import { type PageData } from "../lib/types";

export default function EventGallery() {
  const eventPhotos = [
    [
      "buffet-display",
      "Fruit platters and a carved watermelon basket on the buffet table",
    ],
    ["catering-team", "Our catering and hospitality team behind the buffet"],
    [
      "fruit-buffet",
      "Pineapple and watermelon platters with a carved fruit centrepiece",
    ],
    ["chicken", "Chicken pieces with a rich sauce and herb garnish"],
    ["pilau", "Spiced rice served in a buffet chafing dish"],
    ["vegetable-rice", "Rice with peas and diced vegetables"],
    ["mukimo", "Mukimo with maize served at the buffet"],
    [
      "mixed-vegetables",
      "Mixed vegetables with carrots, green beans and broccoli",
    ],
    ["beans", "Beans with shredded carrot garnish"],
    ["sauced-chicken", "A platter of chicken with herb garnish"],
    ["meat-stew", "Meat stew with carrots in a buffet chafing dish"],
    ["chapati", "Fresh chapati cut into triangles for buffet service"],
    [
      "juice-dispensers",
      "Three juice dispensers at an outdoor refreshment station",
    ],
    ["juice-stand", "Colourful refreshments arranged on a gold display stand"],
    ["juice-cups", "Individual cups of refreshments ready for guests"],
    [
      "refreshment-service",
      "Hospitality staff assisting guests at the refreshment stand",
    ],
    [
      "fruit-tray",
      "Rows of pineapple and watermelon with grapes and strawberries",
    ],
    [
      "pineapple-centrepiece",
      "Pineapple and carved watermelon buffet centrepieces",
    ],
    [
      "pineapple-watermelon-platter",
      "Pineapple and watermelon platter beside a fruit basket",
    ],
    [
      "pineapple-orange-platter",
      "Pineapple slices surrounded by oranges and fruit garnish",
    ],
    ["team-portrait", "The catering team ready to welcome guests"],
    ["fruit-display", "A tiered fruit buffet with a carved watermelon basket"],
    [
      "event-collage",
      "A collage of our team, buffet dishes, refreshments and fruit displays",
    ],
  ];
  return (
    <>
      <section
        className="section section-warm nanny-gallery-section"
        id="event-gallery"
        aria-labelledby="event-gallery-heading"
      >
        <div className="container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">FOOD, FRUIT &amp; HOSPITALITY</p>
              <h2 id="event-gallery-heading">Fresh from our events.</h2>
              <p className="gallery-intro">
                Explore our buffet dishes, fruit displays, refreshments and
                catering team. Select a photo to view it full size, or play a
                video below.
              </p>
            </div>
            <a className="text-link" href="#event-videos">
              Watch event videos &#8595;
            </a>
          </div>

          <div className="nanny-gallery">
            {eventPhotos.map(([file, caption], __index) => (
              <Fragment key={__index}>
                <figure className="nanny-gallery-item">
                  <a
                    className="event-photo-link"
                    href={`/images/events/${file}.jpeg`}
                    target="_blank"
                    rel="noopener"
                    aria-label={`${caption} (opens full-size photo in a new tab)`}
                  >
                    <img
                      src={`/images/events/${file}.jpeg`}
                      alt={caption}
                      loading="lazy"
                      decoding="async"
                    />
                  </a>
                  <figcaption>{caption}</figcaption>
                </figure>
              </Fragment>
            ))}
          </div>
          <div
            className="section-heading event-video-heading"
            id="event-videos"
          >
            <div>
              <p className="eyebrow">SEE OUR WORK IN MOTION</p>
              <h2>Moments from our events.</h2>
              <p className="gallery-intro">Press play to watch each clip.</p>
            </div>
          </div>
          <div className="event-video-grid">
            {[1, 2, 3, 4, 5, 6].map((clip) => (
              <Fragment key={clip}>
                <figure className="event-video-card">
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={`Catering event video ${clip}`}
                  >
                    <source
                      src={`/videos/events/event-${clip}.mp4`}
                      type="video/mp4"
                    />
                    Your browser does not support embedded video.{" "}
                    <a href={`/videos/events/event-${clip}.mp4`}>
                      Open event video {clip}
                    </a>
                    .
                  </video>
                  <figcaption>
                    Event video {clip}{" "}
                    <a
                      href={`/videos/events/event-${clip}.mp4`}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Open event video ${clip} in a new tab`}
                    >
                      Open video &#8599;
                    </a>
                  </figcaption>
                </figure>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
