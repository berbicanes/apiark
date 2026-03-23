window.BENCHMARK_DATA = {
  "lastUpdate": 1774252568994,
  "repoUrl": "https://github.com/berbicanes/apiark",
  "entries": {
    "ApiArk Benchmarks": [
      {
        "commit": {
          "author": {
            "email": "anes@dispatchintegration.com",
            "name": "Anes Berbic",
            "username": "berbicanes"
          },
          "committer": {
            "email": "anes@dispatchintegration.com",
            "name": "Anes Berbic",
            "username": "berbicanes"
          },
          "distinct": true,
          "id": "9cfc7fb2eb0d0f838d430d2234022a058c73ef28",
          "message": "style: fix cargo fmt in lib.rs",
          "timestamp": "2026-03-22T20:26:20+01:00",
          "tree_id": "109e142b44e994d42520f9a4ff89374c0da58101",
          "url": "https://github.com/berbicanes/apiark/commit/9cfc7fb2eb0d0f838d430d2234022a058c73ef28"
        },
        "date": 1774208606252,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1109,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1070,
            "range": "± 16",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 4970,
            "range": "± 94",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4545,
            "range": "± 28",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 147031,
            "range": "± 812",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 16916,
            "range": "± 145",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 36254,
            "range": "± 147",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 68578,
            "range": "± 140",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2442361,
            "range": "± 5789",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 11998157,
            "range": "± 63102",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24559803,
            "range": "± 262527",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 23589,
            "range": "± 134",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 54553,
            "range": "± 215",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 284,
            "range": "± 7",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 1053,
            "range": "± 12",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 4090,
            "range": "± 11",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2908,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 464,
            "range": "± 13",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1509,
            "range": "± 12",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13601,
            "range": "± 47",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 108,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 1008,
            "range": "± 26",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 428,
            "range": "± 16",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 517,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2889,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12716,
            "range": "± 77",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31395,
            "range": "± 110",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 926424,
            "range": "± 9827",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 947133,
            "range": "± 9296",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 977644,
            "range": "± 11435",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1009049,
            "range": "± 20421",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1136712,
            "range": "± 16906",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 964034,
            "range": "± 32084",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "anes@dispatchintegration.com",
            "name": "Anes Berbic",
            "username": "berbicanes"
          },
          "committer": {
            "email": "anes@dispatchintegration.com",
            "name": "Anes Berbic",
            "username": "berbicanes"
          },
          "distinct": true,
          "id": "b4d72e3032fc59783b0ca1f01af8c8808565f589",
          "message": "fix: clean working tree before gh-pages switch in benchmarks CI",
          "timestamp": "2026-03-23T06:29:59+01:00",
          "tree_id": "c96bf5e16b7223e3138bbf535bda0111b9b442e4",
          "url": "https://github.com/berbicanes/apiark/commit/b4d72e3032fc59783b0ca1f01af8c8808565f589"
        },
        "date": 1774244532358,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1095,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1074,
            "range": "± 5",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 5290,
            "range": "± 132",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4579,
            "range": "± 7",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 148894,
            "range": "± 639",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 19979,
            "range": "± 43",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 40620,
            "range": "± 113",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 78105,
            "range": "± 347",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2469298,
            "range": "± 12450",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 12151421,
            "range": "± 41753",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24580094,
            "range": "± 136722",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 23935,
            "range": "± 251",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 54680,
            "range": "± 148",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 289,
            "range": "± 5",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 995,
            "range": "± 7",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 4023,
            "range": "± 87",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2937,
            "range": "± 24",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 453,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1495,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13470,
            "range": "± 53",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 116,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 960,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 441,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 525,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2889,
            "range": "± 27",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12557,
            "range": "± 69",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31024,
            "range": "± 273",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 927458,
            "range": "± 3246",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 944739,
            "range": "± 6867",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 981259,
            "range": "± 4238",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1007714,
            "range": "± 9851",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1138995,
            "range": "± 12290",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 964505,
            "range": "± 11863",
            "unit": "ns/iter"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "anes@dispatchintegration.com",
            "name": "Anes Berbic",
            "username": "berbicanes"
          },
          "committer": {
            "email": "anes@dispatchintegration.com",
            "name": "Anes Berbic",
            "username": "berbicanes"
          },
          "distinct": true,
          "id": "63b9070e7248c2162519c3c7f02993fc861d11db",
          "message": "feat: inherit collection-level auth when request has no auth configured",
          "timestamp": "2026-03-23T08:43:33+01:00",
          "tree_id": "9be429eddccf38085f27347e33469454fce5a31e",
          "url": "https://github.com/berbicanes/apiark/commit/63b9070e7248c2162519c3c7f02993fc861d11db"
        },
        "date": 1774252568108,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1118,
            "range": "± 12",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1096,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 4890,
            "range": "± 143",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4598,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 149062,
            "range": "± 1210",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 16822,
            "range": "± 88",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 41075,
            "range": "± 74",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 67647,
            "range": "± 536",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2484484,
            "range": "± 6438",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 12203829,
            "range": "± 62752",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24459308,
            "range": "± 70299",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 23710,
            "range": "± 138",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 54910,
            "range": "± 248",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 280,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 1038,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 3920,
            "range": "± 15",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2931,
            "range": "± 5",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 449,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1504,
            "range": "± 6",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13567,
            "range": "± 66",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 108,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 940,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 429,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 512,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2817,
            "range": "± 23",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12481,
            "range": "± 52",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31238,
            "range": "± 894",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 931053,
            "range": "± 5055",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 951781,
            "range": "± 8358",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 982825,
            "range": "± 4405",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1017525,
            "range": "± 19519",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1149544,
            "range": "± 9446",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 970059,
            "range": "± 5622",
            "unit": "ns/iter"
          }
        ]
      }
    ]
  }
}