module Main exposing (main)

import Browser exposing (Document, application)
import Browser.Navigation exposing (Key)
import Html exposing (..)
import Url exposing (Protocol(..), Url)


main : Program Flags Model Msg
main =
    application
        { init = init
        , update =
            update
        , subscriptions = always Sub.none
        , onUrlRequest = always NoOp
        , onUrlChange = always NoOp
        , view = view
        }


type alias Model =
    { navigationKey : Key
    , flags : Flags
    , origin : Url
    }

init : Flags -> Url -> Key -> ( Model, Cmd Msg )
init mflags origin navigationKey = (Model navigationKey mflags origin, Cmd.none)

type alias Flags = {}

type Msg = NoOp

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model = (model, Cmd.none)

view : Model -> Document Msg
view model =
    Document "OpenData 2 OSM" ([div [] [ text "hello"]])


