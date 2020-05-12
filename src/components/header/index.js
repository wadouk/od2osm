import { h } from 'preact';
import { Link } from 'preact-router/match';
import style from './style.css';
import LoginStatus from '../LoginStatus';
import {useContextReducer} from '../../reducer'

export default function Header() {
  const [state, dispatch] = useContextReducer()
  const {changes} = state

  const labelChanges = changes.length === 0 ? 'Aucun changement' : `${changes.length} changement${changes.length === 1 ? '' : 's'}`

	return <header className={style.header}>
		<h1><Link activeClassName={style.active} href="/">OpenData to OpenStreetMap</Link></h1>
    <div className={style.spacer}/>
    <Link activeClassName={style.active} href={"/changes"}>{labelChanges}</Link>
    <nav>
      <Link activeClassName={style.active} href={"/quests"}>Quests</Link>
    </nav>
    <Link activeClassName={style.active} href="/authenticated"><LoginStatus/></Link>
	</header>
}
