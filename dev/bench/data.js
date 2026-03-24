window.BENCHMARK_DATA = {
  "lastUpdate": 1774339777794,
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
          "id": "d4533f1d7cd91e2a0ecce71d7ea5c4449b44dead",
          "message": "feat: add Collection Defaults dialog with auth config in context menu",
          "timestamp": "2026-03-23T08:50:10+01:00",
          "tree_id": "08e5808a79147f1b7020f05338ced8089fd36733",
          "url": "https://github.com/berbicanes/apiark/commit/d4533f1d7cd91e2a0ecce71d7ea5c4449b44dead"
        },
        "date": 1774252910134,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1152,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1087,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 4844,
            "range": "± 261",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4697,
            "range": "± 24",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 147767,
            "range": "± 478",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 17067,
            "range": "± 67",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 36395,
            "range": "± 138",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 78718,
            "range": "± 182",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2500640,
            "range": "± 6138",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 12300319,
            "range": "± 43413",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24638225,
            "range": "± 76410",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 24330,
            "range": "± 71",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 54499,
            "range": "± 352",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 278,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 994,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 3926,
            "range": "± 31",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2958,
            "range": "± 25",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 449,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1493,
            "range": "± 13",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13301,
            "range": "± 128",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 106,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 970,
            "range": "± 13",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 433,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 523,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2809,
            "range": "± 5",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12453,
            "range": "± 68",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31053,
            "range": "± 83",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 927680,
            "range": "± 2637",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 944583,
            "range": "± 6881",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 980523,
            "range": "± 4035",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1007198,
            "range": "± 14372",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1137121,
            "range": "± 19058",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 961731,
            "range": "± 3153",
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
          "id": "58b83ab1da7945b7ecf6fb0f9625b2a689013130",
          "message": "chore: bump to v0.4.1",
          "timestamp": "2026-03-23T09:17:52+01:00",
          "tree_id": "732a2524451f92d5646879ba48bdcb03afe94b39",
          "url": "https://github.com/berbicanes/apiark/commit/58b83ab1da7945b7ecf6fb0f9625b2a689013130"
        },
        "date": 1774254588378,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1116,
            "range": "± 29",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1083,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 5007,
            "range": "± 115",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4845,
            "range": "± 20",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 147829,
            "range": "± 1176",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 17445,
            "range": "± 72",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 38921,
            "range": "± 285",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 69311,
            "range": "± 1424",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2489225,
            "range": "± 7299",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 12353575,
            "range": "± 188513",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24965022,
            "range": "± 125816",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 24129,
            "range": "± 548",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 55152,
            "range": "± 410",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 281,
            "range": "± 7",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 1023,
            "range": "± 43",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 3907,
            "range": "± 17",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2925,
            "range": "± 60",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 448,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1493,
            "range": "± 6",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13281,
            "range": "± 340",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 107,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 972,
            "range": "± 153",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 430,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 528,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2941,
            "range": "± 74",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12617,
            "range": "± 103",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31206,
            "range": "± 366",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 932916,
            "range": "± 4229",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 951046,
            "range": "± 11306",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 985453,
            "range": "± 20627",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1015305,
            "range": "± 40946",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1142798,
            "range": "± 29667",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 968168,
            "range": "± 12517",
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
          "id": "f1517238661ec8845a735d04fe14a6e7cc62009a",
          "message": "fix: show user-friendly error messages for AI API auth failures",
          "timestamp": "2026-03-24T07:16:07+01:00",
          "tree_id": "d0ad389519a0fd210610a5a6f9e4577590fda423",
          "url": "https://github.com/berbicanes/apiark/commit/f1517238661ec8845a735d04fe14a6e7cc62009a"
        },
        "date": 1774333698986,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1141,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1109,
            "range": "± 44",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 4837,
            "range": "± 163",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4547,
            "range": "± 20",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 148017,
            "range": "± 5725",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 16890,
            "range": "± 86",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 41237,
            "range": "± 2799",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 77509,
            "range": "± 164",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2484110,
            "range": "± 8451",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 12279523,
            "range": "± 68788",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24725316,
            "range": "± 120780",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 24301,
            "range": "± 99",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 55413,
            "range": "± 1563",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 281,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 1014,
            "range": "± 19",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 3913,
            "range": "± 15",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2947,
            "range": "± 36",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 444,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1514,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13374,
            "range": "± 345",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 107,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 969,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 428,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 515,
            "range": "± 10",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2806,
            "range": "± 17",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12503,
            "range": "± 45",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31200,
            "range": "± 118",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 928874,
            "range": "± 4541",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 947165,
            "range": "± 2527",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 982862,
            "range": "± 3084",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1012530,
            "range": "± 17611",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1138940,
            "range": "± 14298",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 967208,
            "range": "± 39654",
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
          "id": "826b383c0d27a77cf831a333d8672ea61888c0ad",
          "message": "chore: bump to v0.4.2",
          "timestamp": "2026-03-24T07:18:41+01:00",
          "tree_id": "8d1d29868bbe8a3a1a48d88c300952e9f31d2fa1",
          "url": "https://github.com/berbicanes/apiark/commit/826b383c0d27a77cf831a333d8672ea61888c0ad"
        },
        "date": 1774333853966,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 944,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1021,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 5058,
            "range": "± 8",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4598,
            "range": "± 12",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 130848,
            "range": "± 567",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 19225,
            "range": "± 55",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 42083,
            "range": "± 287",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 72851,
            "range": "± 100",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 1929670,
            "range": "± 4888",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 9609322,
            "range": "± 23270",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 19369496,
            "range": "± 31435",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 20196,
            "range": "± 39",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 49959,
            "range": "± 68",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 270,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 1064,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 4005,
            "range": "± 6",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 3453,
            "range": "± 23",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 431,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1426,
            "range": "± 6",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 12511,
            "range": "± 161",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 103,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 698,
            "range": "± 2",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 399,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 474,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2758,
            "range": "± 5",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12125,
            "range": "± 19",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 30530,
            "range": "± 38",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 890842,
            "range": "± 4354",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 920272,
            "range": "± 1900",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 953271,
            "range": "± 3339",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 981738,
            "range": "± 6735",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1104226,
            "range": "± 11007",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 937993,
            "range": "± 2045",
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
          "id": "fb96966dce9efad7a9c0c9f48bec02246edd1f3b",
          "message": "style: fix cargo fmt formatting",
          "timestamp": "2026-03-24T08:57:42+01:00",
          "tree_id": "68d41d745661e1c34283b088fc5c98de801eccc8",
          "url": "https://github.com/berbicanes/apiark/commit/fb96966dce9efad7a9c0c9f48bec02246edd1f3b"
        },
        "date": 1774339776965,
        "tool": "cargo",
        "benches": [
          {
            "name": "assertions/single_status_eq",
            "value": 1156,
            "range": "± 79",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/response_time_lt",
            "value": 1064,
            "range": "± 4",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/nested_body_path",
            "value": 4924,
            "range": "± 92",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/array_index_access",
            "value": 4582,
            "range": "± 14",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/regex_match",
            "value": 148930,
            "range": "± 3369",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/5",
            "value": 17571,
            "range": "± 46",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/10",
            "value": 39904,
            "range": "± 230",
            "unit": "ns/iter"
          },
          {
            "name": "assertions/multiple_assertions/20",
            "value": 81266,
            "range": "± 337",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/100",
            "value": 2438127,
            "range": "± 6481",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/500",
            "value": 12060008,
            "range": "± 44825",
            "unit": "ns/iter"
          },
          {
            "name": "collection_loading/load_tree/1000",
            "value": 24264215,
            "range": "± 125649",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/single_yaml_parse",
            "value": 23525,
            "range": "± 65",
            "unit": "ns/iter"
          },
          {
            "name": "read_request/complex_yaml_parse",
            "value": 54003,
            "range": "± 125",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/simple_get",
            "value": 286,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/post_with_json",
            "value": 1045,
            "range": "± 33",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/complex_with_auth_headers",
            "value": 4080,
            "range": "± 16",
            "unit": "ns/iter"
          },
          {
            "name": "curl_parsing/many_headers_10",
            "value": 2910,
            "range": "± 11",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/simple_1var",
            "value": 454,
            "range": "± 8",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/medium_5vars",
            "value": 1520,
            "range": "± 9",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/heavy_50vars",
            "value": 13758,
            "range": "± 250",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/no_vars_passthrough",
            "value": 107,
            "range": "± 0",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_uuid",
            "value": 978,
            "range": "± 13",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_timestamp",
            "value": 454,
            "range": "± 3",
            "unit": "ns/iter"
          },
          {
            "name": "interpolation/dynamic_randomString",
            "value": 540,
            "range": "± 1",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/5",
            "value": 2901,
            "range": "± 63",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/20",
            "value": 12663,
            "range": "± 32",
            "unit": "ns/iter"
          },
          {
            "name": "interpolate_map/headers/50",
            "value": 31344,
            "range": "± 80",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/empty_script_overhead",
            "value": 924287,
            "range": "± 7195",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_single",
            "value": 943218,
            "range": "± 23948",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/env_set_10_vars",
            "value": 976225,
            "range": "± 37658",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/single_test_assertion",
            "value": 1006048,
            "range": "± 11060",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/multiple_tests_with_json",
            "value": 1135034,
            "range": "± 10153",
            "unit": "ns/iter"
          },
          {
            "name": "scripting/modify_request",
            "value": 959967,
            "range": "± 3249",
            "unit": "ns/iter"
          }
        ]
      }
    ]
  }
}