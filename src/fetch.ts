import { GraphQLClient, gql } from "graphql-request";
import dotenv from "dotenv";
import { round } from "./percentage";
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
): Promise<[{ name: string; count: number; share: number }[], number]> {
    const repos = await fetchAllUserRepos(user);
    const languages = new Map<string, number>();
    let total = 0;
    repos.forEach((repo) => {
        repo.languages.edges.forEach((lang) => {
            const current = languages.get(lang.node.name) ?? 0;
            languages.set(lang.node.name, current + lang.size);
            total += lang.size;
        });
    });

    const shares = round([...languages.values()].map((count) => count / total), 4);

    const result = [...languages.keys()].map((name, i) => ({
        name,
        count: languages.get(name)!,
        share: shares[i],
    }));

    result.sort((a, b) => b.count - a.count);

    return [result, total];
}
