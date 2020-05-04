import { h, Component } from 'preact';
import { Router } from 'preact-router';

import Header from './header';

// Code-splitting is automated for routes
import Home from '../routes/home';
import Authenticated from '../routes/Authenticated';
import style from './app.css'
import Quests from '../routes/Quests'
import Quest from '../routes/Quest'
import Point from '../routes/Point'

export default class App extends Component {
	
	/** Gets fired when the route changes.
	 *	@param {Object} event		"change" event from [preact-router](http://git.io/preact-router)
	 *	@param {string} event.url	The newly routed URL
	 */
	handleRoute = e => {
		this.currentUrl = e.url;
	};

	render() {
		return (
			<div id="app">
				<Header />
				<div className={style.app}>
          <Router onChange={this.handleRoute}>
            <Home path="/" />
            <Quests path="/quests" />
            <Quest path="/quests/:id/points" />
            <Point path="/quests/:qid/points/:pid" />
            <Authenticated path="/authenticated" />
          </Router>
        </div>
			</div>
		);
	}
}
