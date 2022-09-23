import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import Dashboard from "../Dashboard";

import Card from "../Card/Card";

import "../../../style/Dashboard/Home/Home.css";

const Home = () => {
    const announcement = {
        color: 'cyan',
        message: <>
            <p>Badger is building in the open and did not have a beta phase. If you have any struggles or feedback, please reach out to us on <a href="https://discord.gg/8qZ7Y4Z" target="_blank" rel="noreferrer">Discord</a>.</p>
        </>,
    }

    return (
        <Dashboard>
            <div className="home">
                <div className="home__announcement">
                    <Card className="announcement">
                        <div className="announcement__status" style={{ 
                            backgroundColor: announcement.color
                        }}></div>
                        {announcement.message}
                    </Card>
                </div>

                <div className="home__cards">
                    <div className="home__cards__column">
                        <Card>
                            <div className="card__video">
                                <iframe
                                    width="100%"
                                    height="300"
                                    src="https://www.youtube-nocookie.com/embed/C1ofCsq75GY"
                                    title="Live Walkthrough Video"
                                    allow="accelerometer; picture-in-picture"
                                    frameBorder={0}
                                    allowFullScreen={true}
                                ></iframe>
                            </div>
                            <div className="home__card__content">
                                <FontAwesomeIcon icon={['fal', 'play']} />

                                <div>
                                    <h2>Live Walkthrough</h2>
                                    <p style={{
                                        marginBottom: "40px"
                                    }}>Want to see what the live experience of setting up and using Badge is like? Follow along the walk-through and have your Organization, Delegates and Members handled in just minutes.</p>

                                    <a href="#">See full video</a>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="home__card__content">
                                <FontAwesomeIcon icon={['fal', 'notes']} />
                                <div>
                                    <h2>How To</h2>
                                    <p>Designate leaders and members of your organization on-chain. All tools are constructed to be managed directly within a user-friendly dashboard.</p>
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="home__cards__column">
                        <Card>
                            <div className="home__card__content">
                                <FontAwesomeIcon icon={['fal', 'sitemap']} />
                                <div>
                                    <h2>Create your first Organization</h2>
                                    <p>It only takes a few seconds to create your first Organization and be on your way. Badger isn't like your normal tool that takes hours to setup.</p>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="home__card__content">
                                <FontAwesomeIcon icon={['fal', 'notebook']} />
                                <div>
                                    <h2>Docs</h2>
                                    <p>Get a quick overview of the core features and beyond. The UI provides contextualized guidance, but protocol level functions are defined in the docs.</p>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="home__card__content">
                                <FontAwesomeIcon icon={['fal', 'hands']} />
                                <div>
                                    <h2>Contribute</h2>
                                    <p>Networks grow when we work together. We’d love to see what you can build on top of Badger. Check out active Github issue and please reach out!</p>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="home__card__content">
                                <FontAwesomeIcon icon={['fal', 'layer-group']} />
                                <div>
                                    <h2>Blog</h2>
                                    <p>Product updates and implementation guides from builders, contributors, and users.</p>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </Dashboard>
    )
}

export default Home;