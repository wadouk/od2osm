import {Router} from 'preact-router'
import {createHashHistory} from 'history'

import Header from './header'

// Code-splitting is automated for routes
import Home from '../routes/home'
import Authenticated from '../routes/Authenticated'
import style from './app.css'
import Quests from '../routes/Quests'
import Quest from '../routes/Quest'
import Point from '../routes/Point'
import Changes from '../routes/Changes'
import AddQuest from '../routes/AddQuest'
import {initReducer, ReducerContext} from '../reducer'

export default function App() {

  return (
    <div id="app">
      <ReducerContext.Provider value={initReducer()}>
        <Header />
        <div className={style.app}>
          <Router history={createHashHistory()}>
            <Home path="/" />
            <Quests path="/quests" />
            <AddQuest path="/quests/add" />
            <Quest path="/quests/:id/points" />
            <Point path="/quests/:qid/points/:pid" />
            <Authenticated path="/authenticated" />
            <Changes path="/changes" />
          </Router>
        </div>
      </ReducerContext.Provider>
    </div>
  )
}
