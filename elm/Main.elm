port module Main exposing (main)

import Browser exposing (Document, application)
import Browser.Navigation exposing (Key)
import Dict exposing (Dict)
import Html exposing (..)
import Html.Events exposing (onClick)
import Url exposing (Protocol(..), Url)


main : Program Flags Model Msg
main =
    application
        { init = init
        , update =
            update
        , subscriptions = subscriptions
        , onUrlRequest = always NoOp
        , onUrlChange = always NoOp
        , view = view
        }


type alias Model =
    { navigationKey : Key
    , flags : Flags
    , origin : Url
    , token: Maybe String
    }

init : Flags -> Url -> Key -> ( Model, Cmd Msg )
init mflags origin navigationKey =
    let
        q = queryParameters origin
        token = Dict.get "oauth_token" q |> Maybe.map List.head |> Maybe.withDefault Nothing
    in (Model navigationKey mflags origin token, Cmd.none)

type alias Flags = {}

type Msg = NoOp
    | Authenticate
    | Authenticated

type Route =
    Home (Maybe String)

queryParameters : Url -> Dict String (List String)
queryParameters url =
    let
        toTuples : String -> List ( String, String )
        toTuples str =
            case String.split "=" str of
                key :: value -> [ ( key, String.join "=" value ) ]
                [] -> []

        toDict : List ( String, String ) -> Dict String (List String)
        toDict parameters =
            List.foldl
                (\( k, v ) dict -> Dict.update k (addParam v) dict)
                Dict.empty
                parameters

        addParam : String -> Maybe (List String) -> Maybe (List String)
        addParam value maybeValues =
            case maybeValues of
                Just values -> Just (value :: values)
                Nothing -> Just [ value ]
    in
    url.query
        |> Maybe.andThen Url.percentDecode
        |> Maybe.map (String.split "&" >> List.concatMap toTuples >> toDict)
        |> Maybe.withDefault Dict.empty

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp -> (model, Cmd.none)
        Authenticate -> (model, authenticate())
        Authenticated -> (model, Cmd.none)

view : Model -> Document Msg
view model =
    Document "OpenData 2 OSM"
        (Maybe.map (viewAlreadyLogin model) model.token |> Maybe.withDefault (viewLogin model))

viewLogin model =
    [ button [ onClick Authenticate] [ text "Login" ]
    ]

viewAlreadyLogin model token =
    [ span [] [ text token ]
    , button [] [ text "Fetch details"]
    ]

subscriptions : Model -> Sub Msg
subscriptions _ = authenticated (always Authenticated)

port authenticate : () -> Cmd msg

port authenticated : (() -> msg) -> Sub msg
