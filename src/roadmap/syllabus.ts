/**
 * Where each stop on the DSA map is taught in the Amrita B.Tech programmes.
 *
 * Generated from the M04 curricula in Memory/packages/knowledge/curricula (concepts matched per course by the
 * curriculum parser), not typed by hand: the first semester each concept appears in, the course that teaches it,
 * and the other courses that revisit it. A stop absent from a programme is not in that syllabus, and the map says
 * so rather than inventing a course. Regenerate when a curriculum is re-parsed.
 */
import type { ProgrammeId } from "./rules";

export interface Taught {
  sem: number;
  code: string;
  title: string;
  /** Later courses that revisit it. */
  also: { sem: number; code: string; title: string }[];
}

export const SYLLABUS: Record<ProgrammeId, Record<string, Taught>> = {
  cse: {
    arrays: { sem: 1, code: "23CSE101", title: "Computational Problem Solving", also: [{ sem: 3, code: "23CSE201", title: "Procedural Programming using C" }, { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms" }] },
    strings: { sem: 1, code: "23CSE101", title: "Computational Problem Solving", also: [{ sem: 3, code: "23CSE201", title: "Procedural Programming using C" }, { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    time_complexity: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [] },
    hashing: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 6, code: "23CSE314", title: "Compiler Design" }] },
    stacks: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 6, code: "23CSE314", title: "Compiler Design" }] },
    queues: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [] },
    linked_lists: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [] },
    sorting: { sem: 1, code: "23CSE101", title: "Computational Problem Solving", also: [{ sem: 3, code: "23CSE203", title: "Data Structures and Algorithms" }, { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    binary_search: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    recursion: { sem: 1, code: "23CSE101", title: "Computational Problem Solving", also: [{ sem: 2, code: "23MAT116", title: "Discrete Mathematics" }, { sem: 3, code: "23CSE201", title: "Procedural Programming using C" }] },
    divide_and_conquer: { sem: 2, code: "23MAT116", title: "Discrete Mathematics", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    tree_basics: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    tree_traversals: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    binary_search_trees: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    balanced_trees: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [] },
    heaps: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    range_trees: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [] },
    graphs_representation: { sem: 2, code: "23MAT116", title: "Discrete Mathematics", also: [{ sem: 3, code: "23CSE203", title: "Data Structures and Algorithms" }, { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    graph_traversal_bfs: { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms", also: [] },
    graph_traversal_dfs: { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms", also: [] },
    shortest_paths: { sem: 2, code: "23MAT116", title: "Discrete Mathematics", also: [{ sem: 3, code: "23CSE203", title: "Data Structures and Algorithms" }, { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    minimum_spanning_tree: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    topological_sort: { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms", also: [] },
    greedy: { sem: 3, code: "23CSE203", title: "Data Structures and Algorithms", also: [{ sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms" }] },
    dynamic_programming: { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms", also: [] },
    backtracking: { sem: 4, code: "23CSE211", title: "Design and Analysis of Algorithms", also: [] },
  },
  aie: {
    arrays: { sem: 1, code: "22AIE101", title: "Problem Solving & C Programming", also: [{ sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1" }, { sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2" }] },
    strings: { sem: 1, code: "22AIE101", title: "Problem Solving & C Programming", also: [{ sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2" }, { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    time_complexity: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [] },
    bit_manipulation: { sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2", also: [] },
    stacks: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    queues: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    linked_lists: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [] },
    sorting: { sem: 1, code: "22AIE101", title: "Problem Solving & C Programming", also: [{ sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2" }, { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    binary_search: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    recursion: { sem: 1, code: "22AIE101", title: "Problem Solving & C Programming", also: [{ sem: 1, code: "22MAT121", title: "Discrete Mathematics" }, { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1" }] },
    divide_and_conquer: { sem: 1, code: "22MAT121", title: "Discrete Mathematics", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    tree_basics: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2" }, { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    tree_traversals: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2" }, { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    binary_search_trees: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    balanced_trees: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [] },
    heaps: { sem: 2, code: "22AIE112", title: "Data Structures & Algorithms 1", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }] },
    tries: { sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2", also: [] },
    graphs_representation: { sem: 3, code: "22AIE203", title: "Data Structures & Algorithms 2", also: [{ sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms" }, { sem: 4, code: "22BIO211", title: "Intelligence of Biological Systems 2" }] },
    greedy: { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms", also: [] },
    dynamic_programming: { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms", also: [{ sem: 4, code: "22BIO211", title: "Intelligence of Biological Systems 2" }] },
    backtracking: { sem: 4, code: "22AIE212", title: "Design and Analysis of Algorithms", also: [] },
  },
};
