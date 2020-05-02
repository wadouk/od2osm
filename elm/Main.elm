port module Main exposing (main)

import Base64
import Browser exposing (Document, application)
import Browser.Navigation exposing (Key)
import Bytes.Encode
import Dict
import Html exposing (..)
import Html.Attributes exposing (disabled)
import Html.Events exposing (onClick, onInput, onSubmit)
import Http exposing (Header, emptyBody, expectString)
import Json.Decode as Decode exposing (Decoder, andThen, decodeValue, field)
import Json.Decode.Pipeline exposing (required)
import Url exposing (Protocol(..), Url)

import Xml exposing (Value(..), xmlToJson)
import Xml.Encode exposing (null)
import Xml.Decode exposing (decode)
import Xml.Query exposing (collect, int, string, tag, tags)


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
    , login : Maybe String
    , password : Maybe String
    }

init : Flags -> Url -> Key -> ( Model, Cmd Msg )
init mflags origin navigationKey =
    (Model navigationKey mflags origin Nothing Nothing, Cmd.none)

type alias Flags = {}

type Msg = NoOp
    | Authenticate
    | FetchUserDetails String String
    | UserDetailsFetched (Result Http.Error String)
    | InputLogin String
    | InputPassword String


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp -> (model, Cmd.none)
        Authenticate -> (model, authenticate())
        FetchUserDetails l p ->
            let url = "https://api.openstreetmap.org/api/0.6/user/details"
                e = Bytes.Encode.string (l ++ ":" ++ p)
                        |> Bytes.Encode.encode
                        |> Base64.fromBytes

                cmd = e |> Maybe.map (\s -> Http.request { method = "GET", headers = [ Http.header "Authorization" ("Basic " ++ s) ], url = url, body = emptyBody, expect = (expectString UserDetailsFetched), timeout = Nothing, tracker = Nothing}) |> Maybe.withDefault Cmd.none
            in (model, cmd)
        UserDetailsFetched (Ok s) ->
            let
                decodedXml: Value
                decodedXml = s |> decode
                    |> Result.toMaybe
                    |> Maybe.withDefault null

                _ = Debug.log "xml" decodedXml

                person : Value -> Result String User
                person value =
                    case value of
                        Tag "user" attributes _ ->
                            Dict.get ""
                        _ -> Ok null


                root : Value -> Result String { x : User}
                root value =
                    Result.map (\x -> { x = x})
                        (tag "osm" person value)

                people: Result String User
                people = root decodedXml |> Result.map .x

                _ = Debug.log "xml" people

            in noOp model
        UserDetailsFetched (Err e) -> noOp model


        InputLogin "" -> ({model | login = Nothing}, Cmd.none)
        InputLogin s -> ({model | login = Just s}, Cmd.none)
        InputPassword "" -> ({model | password = Nothing}, Cmd.none)
        InputPassword s -> ({model | password = Just s}, Cmd.none)

type alias User =
    { id: Int
    , displayName: String
    }

noOp model = (model, Cmd.none)

view : Model -> Document Msg
view model =
    Document "OpenData 2 OSM"
        -- (Maybe.map (viewAlreadyLogin model) model.token |> Maybe.withDefault (viewLogin model))
        [ div
            [ ]
            [ form
                [ onSubmit (Maybe.map2 (FetchUserDetails) model.login model.password |> Maybe.withDefault NoOp) ]
                [ label
                    []
                    [ text "login" ]
                , input
                    [ onInput InputLogin ]
                    []
                , label
                    [ ]
                    [ text "password" ]
                , input
                    [ onInput InputPassword ]
                    []

                , button
                    [ disabled (Maybe.map2 (\_ _ -> False) model.login model.password |> Maybe.withDefault True)
                    ]
                    [ text "Login" ]
                ]
             ]
        ]

viewLogin model =
    [ button [ onClick Authenticate] [ text "Login" ]
    ]

viewAlreadyLogin model token =
    [ span [] [ text token ]
    , button [] [ text "Fetch details"]
    ]

subscriptions : Model -> Sub Msg
subscriptions _ = Sub.none

port authenticate : () -> Cmd msg

port xhr : (String, String) -> Cmd msg
