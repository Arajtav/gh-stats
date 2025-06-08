import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";
dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;
if (!GITHUB_TOKEN) {
    throw new Error("You must set GITHUB_TOKEN");
}

const client = new GraphQLClient("https://api.github.com/graphql", {
    headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
    },
});

const query = gql`
    query ($login: String!, $after: String) {
        user(login: $login) {
            repositories(first: 100, after: $after, ownerAffiliations: OWNER) {
                nodes {
                    name
                    isArchived
                    languages(
                        first: 10
                        orderBy: { field: SIZE, direction: DESC }
                    ) {
                        edges {
                            size
                            node {
                                name
                                color
                            }
                        }
                    }
                }
                pageInfo {
                    hasNextPage
                    endCursor
                }
            }
        }
    }
`;

type RepoNode = {
    name: string;
    isArchived: boolean;
    languages: {
        edges: {
            size: number;
            node: {
                name: string;
                color: string | null;
            };
        }[];
    };
};

export async function fetchAllUserRepos(user: string): Promise<RepoNode[]> {
    const repos: RepoNode[] = [];
    let hasNextPage = true;
    let after: string | null = null;

    while (hasNextPage) {
        const variables: {
            login: string;
            after?: string | null;
        } = { login: user, after };
        const data = await client.request<{
            user: {
                repositories: {
                    nodes: RepoNode[];
                    pageInfo: {
                        hasNextPage: boolean;
                        endCursor: string | null;
                    };
                };
            } | null;
        }>(query, variables);

        if (!data.user || !data.user.repositories) break;

        const filteredRepos = data.user.repositories.nodes
            .filter((repo) => !repo.isArchived)
            .filter((repo) => repo.name.toLowerCase() != user.toLowerCase());
        repos.push(...filteredRepos);

        hasNextPage = data.user.repositories.pageInfo.hasNextPage;
        after = data.user.repositories.pageInfo.endCursor;
    }

    return repos;
}

export async function fetchAllUserLanguages(
    user: string,
): Promise<{ name: string; count: number }[]> {
    let repos = await fetchAllUserRepos(user);
    let languages = new Map<string, number>();
    repos.forEach((repo) => {
        repo.languages.edges.forEach((lang) => {
            let tmp = languages.get(lang.node.name);
            let next = (tmp ? tmp : 0) + lang.size;
            languages.set(lang.node.name, next);
        });
    });
    return [...languages]
        .map((e) => {
            return { name: e[0], count: e[1] };
        })
        .sort((a, b) => b.count - a.count);
}
