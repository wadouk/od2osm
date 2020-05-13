import style from './loader.css'

export default ({loaderState}) => {
  return (typeof loaderState === 'boolean' && loaderState ? <div className={style.spinner}>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
    <div></div>
  </div> : loaderState ? <span title={loaderState}>&#9888;</span> : null)
}