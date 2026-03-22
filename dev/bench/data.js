window.BENCHMARK_DATA = {
  "lastUpdate": 1774208606675,
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
      }
    ]
  }
}